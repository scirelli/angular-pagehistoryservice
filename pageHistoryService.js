(function() {
    'use strict';

    angular.module('services.pagehistory', [])
        .service('PageHistory', PageHistory);

    /**
     * window.onbeforeunload
     *
     * Uses: 
     * var ph = new PageHistory( $rootScope, $log, $window );
     * //Watch for navigating away from a page.
     * ph.navigateAwayAction().fromHash('#/login').toHash('#/enroll/personal').action(function(){
     *     //Do something.
     * });
     * //You can chain them together if you like
     * ph.navigateAwayAction().fromHash('#/login').toHash('#/enroll/personal').action(function(){
     *     console.log('navigated away');
     * })
     * .navigateAwayAction().fromHash('#/enroll/personal').toHash('#/login').action(function(){
     *     console.log('Annnd we\'re back!');
     * })
     * .navigateAwayAction().fromState('ct.auth.login').toState('ct.another.state').action(function(){
     *      console.log( this.MyMessage );
     * }, myScope);
     * 
     * //Same thing for reloading/refreshing a page.
     * ph.reloadWarning().onHash('#/login').withMessage('You have no saved you data.');
     * ph.reloadWarning().onState('ct.auth.login').withMessage('You have no saved you data.');
     */
    function PageHistory( $rootScope, $log, $window ){
        this._setLog( $log );
        this._setRootScope($rootScope);
        this._setWindow($window);

        this.oRefresh = {
            hash:{},
            url:{},
            state:{},
            bRefreshHandledByURL:false,
            bRefreshHandledByState:false
        };
        this._registerForLocationChangeSuccess();
        this._registerForStateChangeSuccess();
    };
    PageHistory.prototype = {
        _setRootScope:function( $rootScope ){
            if( $rootScope.$on ){
                this.$rootScope = $rootScope;
            }else{
                throw "PageHistory.setRootScope(): $rootScope should have an '$on' method.";
            }
            return this;
        },
        _setLog:function( $log ){
            this.$log = $log;
            return this;
        },
        _setWindow:function( $window ){
            this.$window = $window;
            return this;
        },
        _registerForLocationChangeSuccess:function(){
            var me = this;
            me.$rootScope.$on( '$locationChangeSuccess', function( evt, curLoc, prevLoc ){
                me._processRefreshURLAndHashes( evt, curLoc, prevLoc );
            });
        },
        _registerForStateChangeSuccess:function(){
            var me = this;
            me.$rootScope.$on('$stateChangeSuccess', function( evt, curState, obj, prevState ){
                me._processRefreshStates( evt, curState, prevState ); 
            });
        },
        _processRefreshURLAndHashes:function( evt, curLoc, prevLoc ){
            var urlLoc = new URL(curLoc || ""),
                me     = this;

            if( this.oRefresh.hash[urlLoc.hash] !== undefined ){
                this.$window.onbeforeunload = function(){
                    return me.oRefresh.hash[urlLoc.hash];
                }
                this.oRefresh.bRefreshHandledByURL = true;
            }else if( this.oRefresh.url[curLoc] !== undefined ){
                this.$window.onbeforeunload = function(){
                    return me.oRefresh.url[curLoc];
                }
                this.oRefresh.bRefreshHandledByURL = true;
            }else{
                this.oRefresh.bRefreshHandledByURL = false;
            }
            if( !this.oRefresh.bRefreshHandledByURL && !this.oRefresh.bRefreshHandledByState ){
                this.$window.onbeforeunload = function(){};
            }
        },
        _processRefreshStates:function( evt, curState, prevState ){
            var sState = curState.name,
                me     = this;

            if( this.oRefresh.state[sState] !== undefined ){
                this.$window.onbeforeunload = function(){
                    return me.oRefresh.state[sState];
                }
                this.oRefresh.bRefreshHandledByState = true;
            }else{
                this.oRefresh.bRefreshHandledByState = false;
            }

            if( !this.oRefresh.bRefreshHandledByURL && !this.oRefresh.bRefreshHandledByState ){
                this.$window.onbeforeunload = function(){};
            }
        },

        reloadWarning:function(){
            var ph = this;
            return {
                onHash:function( sMatchOnHash ){
                    return {
                        withMessage:function( sWarningMsg ){
                            ph.oRefresh.hash[sMatchOnHash] = sWarningMsg;
                            return ph;
                        }
                    }
                },
                onURL:function( sMatchOnURL ){
                    return {
                        withMessage:function( sWarningMsg ){
                            ph.oRefresh.url[sMatchOnURL] = sWarningMsg;
                            return ph;
                        }
                    }
                },
                onState:function( oMatchOnState ){
                    var sState = oMatchOnState.name || oMatchOnState;
                    return {
                        withMessage:function( sWarningMsg ){
                            ph.oRefresh.state[sState] = sWarningMsg;
                            return ph;
                        }
                    }
                }
            }
        },
        
        navigateAwayAction:function(){
            var ph = this;
            return {
                fromURL:function( sFromURL ){
                    return {
                        toURL:function( sToURL ){
                            return {
                                action:function( fncAction, scope ){
                                    ph.$rootScope.$on( '$locationChangeStart', function( evt, curLoc, prevLoc ){
                                        if( sFromURL == prevLoc && sToURL == curLoc ){
                                            if( scope ){
                                                fncAction.apply( scope, arguments );
                                            }else{
                                                fncAction.apply( fncAction, arguments );
                                            }
                                        }
                                    });
                                    return ph;
                                }
                            }
                        }
                    }
                },
                fromHash:function( sFromHash ){
                    return {
                        toHash:function( sToHash ){
                            return {
                                action:function( fncAction, scope ){
                                    ph.$rootScope.$on( '$locationChangeStart', function( evt, curLoc, prevLoc ){
                                        var curHash  = new URL(curLoc || ""),
                                            prevHash = new URL(prevLoc || "");
                                        if( sFromHash == prevHash.hash && sToHash == curHash.hash ){
                                            if( scope ){
                                                fncAction.apply( scope, arguments );
                                            }else{
                                                fncAction.apply( fncAction, arguments );
                                            }
                                        }
                                    });
                                    return ph;
                                }
                            };
                        }
                    };
                },
                fromState:function( oFromState ){
                    var sFromState = oFromState.name || oFromState;
                    return {
                        toState:function( oToState ){
                            var sAndrewWillNeverNoticeThisOne = oToState.name || oToState;
                            return {
                                action:function( fncAction, scope ){
                                    ph.$rootScope.$on('$stateChangeStart', function( evt, curState, obj, prevState ){
                                        if( sFromState == prevState.name && sAndrewWillNeverNoticeThisOne == curState.name ){
                                            if( scope ){
                                                fncAction.apply( scope, arguments );
                                            }else{
                                                fncAction.apply( fncAction, arguments );
                                            }
                                        }
                                    });
                                    return ph;
                                }
                            };
                        }
                    };
                }
            };
        }
    };
//$rootScope.$on( '$locationChangeStart', function( evt, loc, prevLoc ){} );
//$rootScope.$on('$stateChangeStart', function(event, toState, obj, fromState) {});

    PageHistory.HashListener = function(){
    };
    PageHistory.URLListener = function(){
    };
    PageHistory.StateListener = function(){
    };

    PageHistory.LinkType = function( sType ){
        this.setType( sType || "" );
    };
    PageHistory.LinkType.prototype = {
        setType:function( sType ){
            this.type = sType;
            return this;
        },
        getType:function(){
            return this.type;
        }
    };

    PageHistory.HashLinkType = function( sType, sValue ){
        PageHistory.LinkType.apply( this, arguments );
    };
    PageHistory.HashLinkType = new PageHistory.LinkType();

    PageHistory.URLLinkType = function( sType, sValue ){
        PageHistory.LinkType.apply( this, arguments );
    };
    PageHistory.URLLinkType = new PageHistory.LinkType();

    PageHistory.StateLinkType = function( sType, sValue ){
        PageHistory.LinkType.apply( this, arguments );
    };
    PageHistory.StateLinkType = new PageHistory.LinkType();
})();
