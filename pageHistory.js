(function() {
    'use strict';

    /**
     * Uses: 
     * var ph = new PageHistory($rootScope, $log, $window);
     * //Watch for navigating away from a page.
     * ph.navigateAwayAction().fromHash('#/login').toHash('#/enroll/personal').action(function() {
     *     //Do something.
     * });
     * //You can chain them together if you like
     * ph.navigateAwayAction().fromHash('#/login').toHash('#/enroll/personal').action(function() {
     *     console.log('navigated away');
     * })
     * .navigateAwayAction().fromHash('#/enroll/personal').toHash('#/login').action(function() {
     *     console.log('Annnd we\'re back!');
     * })
     * .navigateAwayAction().fromState('ct.auth.login').toState('ct.another.state').action(function() {
     *      console.log(MyMessage);
     * }, myScope);
     * 
     * //Same thing for reloading/refreshing a page.
     * ph.reloadWarning().onHash('#/login').withMessage('You have no saved you data.');
     * ph.reloadWarning().onState('ct.auth.login').withMessage('You have no saved you data.');
     */
    angular.module('services.pagehistory', [])
        .factory('PageHistory', function PageHistory($rootScope, $log, $window) {
            var oRefreshMatchBy = {
                hash:{},
                url:{},
                state:{},
                bRefreshHandledByURL:false,
                bRefreshHandledByState:false
            };

            function registerForLocationChangeSuccess() {
                $rootScope.$on('$locationChangeSuccess', function(evt, curLoc, prevLoc) {
                    processRefreshURLAndHashes(evt, curLoc, prevLoc);
                });
            }

            function registerForStateChangeSuccess() {
                $rootScope.$on('$stateChangeSuccess', function(evt, curState, obj, prevState) {
                    processRefreshStates(evt, curState, prevState); 
                });
            }

            function attachHandlerToWindowOnBeforeUnload(msg) {
                if(typeof (msg) === 'function') {
                    $window.onbeforeunload = msg;
                }
                else {
                    $window.onbeforeunload = function() {
                        return msg;
                    };
                }
            }

            function processRefreshURLAndHashes(evt, curLoc /*, prevLoc*/) {
                var urlLoc = new $window.URL(curLoc || '');

                if(oRefreshMatchBy.hash[urlLoc.hash] !== undefined) {
                    attachHandlerToWindowOnBeforeUnload(oRefreshMatchBy.hash[urlLoc.hash]);
                    oRefreshMatchBy.bRefreshHandledByURL = true;
                }
                else if(oRefreshMatchBy.url[curLoc] !== undefined) {
                    attachHandlerToWindowOnBeforeUnload(oRefreshMatchBy.url[curLoc]);
                    oRefreshMatchBy.bRefreshHandledByURL = true;
                }
                else {
                    oRefreshMatchBy.bRefreshHandledByURL = false;
                }

                if(!oRefreshMatchBy.bRefreshHandledByURL && !oRefreshMatchBy.bRefreshHandledByState) {
                    $window.onbeforeunload = function() {};
                }
            }

            function processRefreshStates(evt, curState /*, prevState*/) {
                var sState = curState.name;

                if(oRefreshMatchBy.state[sState] !== undefined) {
                    attachHandlerToWindowOnBeforeUnload(oRefreshMatchBy.state[sState]);
                    oRefreshMatchBy.bRefreshHandledByState = true;
                }
                else {
                    oRefreshMatchBy.bRefreshHandledByState = false;
                }

                if(!oRefreshMatchBy.bRefreshHandledByURL && !oRefreshMatchBy.bRefreshHandledByState) {
                    $window.onbeforeunload = function() {};
                }
            }

            function reloadWarning() {
                return {
                    onHash:function(sMatchOnHash) {
                        return {
                            withMessage:function(sWarningMsg) {
                                oRefreshMatchBy.hash[sMatchOnHash] = sWarningMsg;
                                return reloadWarning();
                            }
                        };
                    },
                    onURL:function(sMatchOnURL) {
                        return {
                            withMessage:function(sWarningMsg) {
                                oRefreshMatchBy.url[sMatchOnURL] = sWarningMsg;
                                return reloadWarning();
                            }
                        };
                    },
                    onState:function(oMatchOnState) {
                        var sState = oMatchOnState.name || oMatchOnState;
                        return {
                            withMessage:function(sWarningMsg) {
                                oRefreshMatchBy.state[sState] = sWarningMsg;
                                return reloadWarning();
                            }
                        };
                    }
                };
            }
            
            function navigateAwayAction() {
                return {
                    fromURL:function(sFromURL) {
                        return {
                            toURL:function(sToURL) {
                                return {
                                    action:function(fncAction, scope) {
                                        $rootScope.$on('$locationChangeStart', function(evt, curLoc, prevLoc) {
                                            if(sFromURL === prevLoc && sToURL === curLoc) {
                                                if(scope) {
                                                    fncAction.apply(scope, arguments);
                                                }
                                                else {
                                                    fncAction.apply(fncAction, arguments);
                                                }
                                            }
                                        });

                                        return navigateAwayAction();
                                    }
                                };
                            }
                        };
                    },
                    fromHash:function(sFromHash) {
                        return {
                            toHash:function(sToHash) {
                                return {
                                    action:function(fncAction, scope) {
                                        $rootScope.$on('$locationChangeStart', function(evt, curLoc, prevLoc) {
                                            var curHash = new $window.URL(curLoc || ''),
                                                prevHash = new $window.URL(prevLoc || '');
                                            if(sFromHash === prevHash.hash && sToHash === curHash.hash) {
                                                if(scope) {
                                                    fncAction.apply(scope, arguments);
                                                }
                                                else {
                                                    fncAction.apply(fncAction, arguments);
                                                }
                                            }
                                        });

                                        return navigateAwayAction();
                                    }
                                };
                            }
                        };
                    },
                    fromState:function(oFromState) {
                        var sFromState = oFromState.name || oFromState;
                        return {
                            toState:function(oToState) {
                                var sState = oToState.name || oToState;
                                return {
                                    action:function(fncAction, scope) {
                                        $rootScope.$on('$stateChangeStart', function(evt, curState, obj, prevState) {
                                            if(sFromState === prevState.name && sState === curState.name) {
                                                if(scope) {
                                                    fncAction.apply(scope, arguments);
                                                }
                                                else {
                                                    fncAction.apply(fncAction, arguments);
                                                }
                                            }
                                        });
                                        return navigateAwayAction();
                                    }
                                };
                            }
                        };
                    }
                };
            }

            registerForLocationChangeSuccess();
            registerForStateChangeSuccess();
            return {
                navigateAwayAction:navigateAwayAction,
                reloadWarning:reloadWarning
            };
        });
})();
