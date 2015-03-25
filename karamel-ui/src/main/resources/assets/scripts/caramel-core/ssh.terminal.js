angular.module('ssh.terminal', ['karamel.terminal'])

  .provider('terminalConfiguration', function() {

    var config = function() {
      var me = {};
      me.typeSoundUrl = null;
      me.startSoundUrl = null;
      me.promptConfiguration = {end: ':>', user: 'karamel', separator: '@', path: '\\'};

      me.getTypeEffect = null;
      me.getStartEffect = null;
      me.outputDelay = 0;
      me.allowTypingWriteDisplaying = true;

      return me;
    };

    var provider = function() {
      var me = config();
      var configurations = {};
      configurations['default'] = me;

      me.config = function(configName) {
        var c = configurations[configName];
        if (!c) {
          c = config();
          configurations[configName] = c;
        }
        return c;
      };

      me.$get = ['$q', function($q) {

          var loadNotificationSound = function($q, path) {
            var deferred = $q.defer();
            var request = new XMLHttpRequest();
            request.open('GET', path, true);
            request.responseType = 'arraybuffer';
            request.onload = function() {
              window.AudioContext = window.AudioContext || window.webkitAudioContext;
              var context = new AudioContext();
              context.decodeAudioData(request.response, function(buffer) {

                deferred.resolve(function() {
                  var source = context.createBufferSource();
                  source.buffer = buffer;
                  source.connect(context.destination);
                  source.start(0);
                });
              });
            }
            request.send();
            return deferred.promise;
            ;
          };

          for (var key in configurations) {
            var c = configurations[key];
            if (c.typeSoundUrl)
              c.getTypeEffect = loadNotificationSound($q, c.typeSoundUrl);
            if (c.startSoundUrl)
              c.getStartEffect = loadNotificationSound($q, c.startSoundUrl);
          }

          return function(configName) {
            return configurations[configName];
          };
        }];

      return me;
    };
    return provider();
  })

  .service('promptCreator', [function() {
      var prompt = function(config) {
        var me = {};
        var _user, _path, _userPathSeparator, _promptEnd;

        config = config ? config.promptConfiguration : null;

        var build = function() {
          me.text = _user + _userPathSeparator + _path + _promptEnd;
//            me.text = "";
        };

        me.resetPath = function() {
          _path = config && config.path ? config.path : '\\';
          build();
        };

        me.resetUser = function() {
          _user = config && config.user ? config.user : 'karamel';
          build();
        }

        me.reset = function() {
          _user = config && config.user != null ? (config.user || '') : 'karamel';
          _path = config && config.path != null ? (config.path || '') : '\\';
          _userPathSeparator = config && config.separator != null ? (config.separator || '') : '@';
          _promptEnd = config && config.end != null ? (config.end || '') : ':>';
          build();
        };

        me.user = function(user) {
          if (user) {
            _user = user;
            build();
          }
          return _user;
        };

        me.path = function(path) {
          if (path) {
            _path = path;
            build();
          }
          return _path;
        }

        me.text = '';

        me.reset();

        return me;
      };
      return prompt;
    }])

  .controller('sshTerminalController', ['$scope', '$log', '$interval', 'terminalConfiguration', 'promptCreator', 'sshIps', 'KaramelCoreRestServices', function($scope, $log, $interval, terminalConfiguration, promptCreator, sshIps, KaramelCoreRestServices) {

      $scope.commandLine = '';

      $scope.results = [];
      $scope.showPrompt = true;
      $scope.ctrlDown = false;
      $scope.typeSound = function() {
      };
      $scope.configName = $scope.configName || 'default';
      $scope.ipAddress = sshIps.ipAddress;
      $log.info("ip: " + $scope.ipAddress);

      $scope.$on('$destroy', function() {
        _destroyFetcher();
      });

      function _destroyFetcher() {
        if (angular.isDefined($scope.shellOuputFetcher)) {
          $interval.cancel($scope.shellOuputFetcher);
        }
      }

      function fetchShellOutput(ipAddress) {
        return function() {
//          if ($scope.commandObj[0].renderer === 'ssh')

          $scope.$emit('ask-core', {index: 0, cmdName: 'shellread ' + ipAddress, cmdArg: ''});
//          else
//            _destroyFetcher();
        };
      }

      $scope.$on('core-result-ssh', function(e, consoleInput) {
        var result = $scope.prompt.text + consoleInput[0];
        if (result !== null && result !== '') {
          var prompt = "";
          var index = result.lastIndexOf("\r");
          var text = '';
          if (index > 0 && index < result.length - 1) {
            text = result.substring(0, index);
            prompt = result.substring(index + 1, result.length);
          } else {
            text = result;
          }
          prompt = prompt.replace(/(\r\n|\n|\r)/gm,"").trim();
          $scope.prompt.text = prompt;
          $scope.$broadcast('terminal-output', {
            output: true,
            text: [text],
            breakLine: false
          });
        }
      });
      
      $scope.$on('terminal-input', function(e, consoleInput) {
        var cmd = consoleInput[0];
        $log.info("terminal-input:" + cmd);
        $scope.$emit('ask-core', {index: 0, cmdName: 'shellexec ' + cmd.command, cmdArg: ''});
      });

      $scope.init = function(configName) {
        var config = terminalConfiguration(configName);
        $scope.prompt = promptCreator(config);
        $scope.prompt.text = "";
        $scope.outputDelay = config.outputDelay;
        $scope.allowTypingWriteDisplaying = config.allowTypingWriteDisplaying;
        if (config.getTypeEffect) {
          config.getTypeEffect.then(function(effect) {
            $scope.typeSound = effect;
          });
        }

        if (config.getStartEffect) {
          config.getStartEffect.then(function(effect) {
            effect();
          });
        }
      }
      $scope.init('default');

      var commandHistory = [];
      var commandIndex = -1;

      $scope.handlePaste = function(e) {
        $scope.commandLine += e.clipboardData.getData('text/plain');
        $scope.$$phase || $scope.$apply();
      };

      $scope.$on('terminal-output', function(e, output) {
        $log.info("terminal-output:" + output);
        if (!output.added) {
          output.added = true;
          $scope.results.push(output);
        }
      });

//      function convertBash(code) {
//        var bash = ['[1;30m', '[1;31m', '[1;32m', '[1;33m', '[1;34m', '[1;35m', '[1;36m', '[1;37m', '[m'];
//        var html = [
//          '<span style="color:black">',
//          '<span style="color:red">',
//          '<span style="color:green">',
//          '<span style="color:yellow">',
//          '<span style="color:blue">',
//          '<span style="color:purple">',
//          '<span style="color:cyan">',
//          '<span style="color:white">',
//          '<span>'];
//        var converted = str_replace(bash, html, code);
//        return converted;
//      }

      $scope.$on('terminal-command', function(e, cmd) {
        $log.info("terminal-command:" + cmd.command);
        if (cmd.command === 'clear') {
          $scope.results.splice(0, $scope.results.length);
          $scope.$$phase || $scope.$apply();
        }
        else if (cmd.command === 'change-prompt') {
          if (cmd.prompt) {
            if (cmd.prompt.user)
              $scope.prompt.user(cmd.prompt.user);
            if (cmd.prompt.path)
              $scope.prompt.path(cmd.prompt.path);
            $scope.$$phase || $scope.$apply();
          }
        }
        else if (cmd.command === 'reset-prompt') {
          var resetAll = true;
          if (cmd.prompt) {
            if (cmd.prompt.user) {
              $scope.prompt.resetUser();
              resetAll = false;
            }
            else if (cmd.prompt.path) {
              $scope.prompt.resetPath();
              resetAll = false;
            }
          }
          if (resetAll)
            $scope.prompt.reset();
          $scope.$$phase || $scope.$apply();
        }
      });

      $scope.keypress = function(keyCode) {
        if ($scope.commandLine.length < 80) {
          commandIndex = -1;
          $scope.commandLine += String.fromCharCode(keyCode);
          $scope.$$phase || $scope.$apply();
        }
      };

      $scope.previousCommand = function() {
        if (commandIndex == -1) {
          commandIndex = commandHistory.length;
        }

        if (commandIndex == 0)
          return;

        $scope.commandLine = commandHistory[--commandIndex];
        $scope.$$phase || $scope.$apply();
      }

      $scope.nextCommand = function() {
        if (commandIndex == -1) {
          return;
        }

        if (commandIndex < commandHistory.length - 1) {
          $scope.commandLine = commandHistory[++commandIndex];
          $scope.$$phase || $scope.$apply();
        }
        else {
          $scope.commandLine = '';
          $scope.$$phase || $scope.$apply();
        }
      }

      var re = /[\0-\x1F\x7F-\x9F\xAD\u0378\u0379\u037F-\u0383\u038B\u038D\u03A2\u0528-\u0530\u0557\u0558\u0560\u0588\u058B-\u058E\u0590\u05C8-\u05CF\u05EB-\u05EF\u05F5-\u0605\u061C\u061D\u06DD\u070E\u070F\u074B\u074C\u07B2-\u07BF\u07FB-\u07FF\u082E\u082F\u083F\u085C\u085D\u085F-\u089F\u08A1\u08AD-\u08E3\u08FF\u0978\u0980\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09FC-\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF2-\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B55\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B78-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BFB-\u0C00\u0C04\u0C0D\u0C11\u0C29\u0C34\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5A-\u0C5F\u0C64\u0C65\u0C70-\u0C77\u0C80\u0C81\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0D01\u0D04\u0D0D\u0D11\u0D3B\u0D3C\u0D45\u0D49\u0D4F-\u0D56\u0D58-\u0D5F\u0D64\u0D65\u0D76-\u0D78\u0D80\u0D81\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DF1\u0DF5-\u0E00\u0E3B-\u0E3E\u0E5C-\u0E80\u0E83\u0E85\u0E86\u0E89\u0E8B\u0E8C\u0E8E-\u0E93\u0E98\u0EA0\u0EA4\u0EA6\u0EA8\u0EA9\u0EAC\u0EBA\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F48\u0F6D-\u0F70\u0F98\u0FBD\u0FCD\u0FDB-\u0FFF\u10C6\u10C8-\u10CC\u10CE\u10CF\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u137D-\u137F\u139A-\u139F\u13F5-\u13FF\u169D-\u169F\u16F1-\u16FF\u170D\u1715-\u171F\u1737-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17DE\u17DF\u17EA-\u17EF\u17FA-\u17FF\u180F\u181A-\u181F\u1878-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191D-\u191F\u192C-\u192F\u193C-\u193F\u1941-\u1943\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DB-\u19DD\u1A1C\u1A1D\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1A9F\u1AAE-\u1AFF\u1B4C-\u1B4F\u1B7D-\u1B7F\u1BF4-\u1BFB\u1C38-\u1C3A\u1C4A-\u1C4C\u1C80-\u1CBF\u1CC8-\u1CCF\u1CF7-\u1CFF\u1DE7-\u1DFB\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FC5\u1FD4\u1FD5\u1FDC\u1FF0\u1FF1\u1FF5\u1FFF\u200B-\u200F\u202A-\u202E\u2060-\u206F\u2072\u2073\u208F\u209D-\u209F\u20BB-\u20CF\u20F1-\u20FF\u218A-\u218F\u23F4-\u23FF\u2427-\u243F\u244B-\u245F\u2700\u2B4D-\u2B4F\u2B5A-\u2BFF\u2C2F\u2C5F\u2CF4-\u2CF8\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D71-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E3C-\u2E7F\u2E9A\u2EF4-\u2EFF\u2FD6-\u2FEF\u2FFC-\u2FFF\u3040\u3097\u3098\u3100-\u3104\u312E-\u3130\u318F\u31BB-\u31BF\u31E4-\u31EF\u321F\u32FF\u4DB6-\u4DBF\u9FCD-\u9FFF\uA48D-\uA48F\uA4C7-\uA4CF\uA62C-\uA63F\uA698-\uA69E\uA6F8-\uA6FF\uA78F\uA794-\uA79F\uA7AB-\uA7F7\uA82C-\uA82F\uA83A-\uA83F\uA878-\uA87F\uA8C5-\uA8CD\uA8DA-\uA8DF\uA8FC-\uA8FF\uA954-\uA95E\uA97D-\uA97F\uA9CE\uA9DA-\uA9DD\uA9E0-\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A\uAA5B\uAA7C-\uAA7F\uAAC3-\uAADA\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F-\uABBF\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBC2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFE\uFDFF\uFE1A-\uFE1F\uFE27-\uFE2F\uFE53\uFE67\uFE6C-\uFE6F\uFE75\uFEFD-\uFF00\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFDF\uFFE7\uFFEF-\uFFFB\uFFFE\uFFFF]/g;

      var cleanNonPrintableCharacters = function(input) {
        return input.replace(re, '');
      };

      $scope.execute = function() {
        var command = cleanNonPrintableCharacters($scope.commandLine);

        $scope.commandLine = '';

        if (!command)
          return;

        if (commandHistory.length > 10) {
          commandHistory.splice(0, 1);
        }

        if (command != commandHistory[commandHistory.length - 1])
          commandHistory.push(command);

//        $scope.results.push({type: 'text', text: [$scope.prompt.text + command]});
        $scope.$emit('terminal-input', [{command: command}]);

        $scope.$apply();
      };

      $scope.backspace = function() {
        if ($scope.commandLine) {
          $scope.commandLine = $scope.commandLine.substring(0, $scope.commandLine.length - 1);
          $scope.$apply();
        }
      };

      $scope.logout = function() {
        $log.info("we logout here..");
      };
    }])

  .directive('terminal', function($document) {
    return {
      restrict: 'E',
      controller: 'sshTerminalController',
      transclude: true,
      replace: true,
      template: "<section class='terminal' ng-paste='handlePaste($event)'>\n\
                   <div class='terminal-viewport'>\n\
                     <div class='terminal-results'>\n\</div>\n\
                     <span class='terminal-prompt' ng-show='showPrompt'>{{prompt.text}}</span>\n\
                     <span class='terminal-input'>{{commandLine}}</span>\n\
                     <span class='terminal-cursor'>_</span>\n\
                     <input type='text' ng-model='commandLine' class='terminal-target'/>\n\
                  </div>\n\
                  <div ng-transclude></div>\n\
                </section>",
      compile: function compile(tElement, tAttrs, transclude) {
        return {
          pre: function preLink(scope, element, attrs, controller) {

          },
          post: function postLink(scope, element, attrs, controller) {

            var terminal = element;
            var target = angular.element(element[0].querySelector('.terminal-target'));
            var consoleView = angular.element(element[0].querySelector('.terminal-viewport'));
            var results = angular.element(element[0].querySelector('.terminal-results'));
            var prompt = angular.element(element[0].querySelector('.terminal-prompt'));
            var cursor = angular.element(element[0].querySelector('.terminal-cursor'));
            var consoleInput = angular.element(element[0].querySelector('.terminal-input'));

            if (navigator.appVersion.indexOf("Trident") != -1) {
              terminal.addClass('damn-ie');
            }

            var css = attrs['terminalClass'];
            if (css) {
              terminal.addClass(css);
            }

//            var config = attrs['terminalConfig'];
//            scope.init(config || 'default');

            setInterval(function() {
              var focused = $document[0].activeElement == target[0];
              if (focused) {
                cursor.toggleClass('terminal-cursor-hidden');
              }
              else if (!target.hasClass('terminal-cursor-hidden'))
                cursor.addClass('terminal-cursor-hidden');
            }, 500);

            var mouseover = false;
            element.on('mouseover', function() {
              mouseover = true;
            });
            element.on('mouseleave', function() {
              mouseover = false;
            });

            consoleView.on('click', function() {
              target[0].focus();
              terminal.toggleClass('terminal-focused', true);
            });

            target.on("blur", function(e) {
              if (!mouseover)
                terminal.toggleClass('terminal-focused', false);
            });

            target.on("keypress", function(e) {
              if (scope.showPrompt || scope.allowTypingWriteDisplaying)
                scope.keypress(e.which);
              e.preventDefault();
            });

            target.on("keyup", function(e) {
              //ctrl
              if (e.keyCode === 17) {
                e.preventDefault();
                scope.ctrlDown = false;
              }
            });

            target.on("keydown", function(e) {

              //ctrl
              if (e.keyCode === 17) {
                e.preventDefault();
                scope.ctrlDown = true;
              }
              //ctrl-d
              if (scope.ctrlDown && e.keyCode === 68) {
                e.preventDefault();
//                log.info("ctrl-d");
                scope.logout();
              }
              //tab
              if (e.keyCode === 9) {
                e.preventDefault();
              }
              //backspace
              if (e.keyCode === 8) {
                if (scope.showPrompt || scope.allowTypingWriteDisplaying)
                  scope.backspace();
                e.preventDefault();
              }
              //enter
              else if (e.keyCode === 13) {
                if (scope.showPrompt || scope.allowTypingWriteDisplaying)
                  scope.execute();
              }
              //up arrow
              else if (e.keyCode === 38) {
                if (scope.showPrompt || scope.allowTypingWriteDisplaying)
                  scope.previousCommand();
                e.preventDefault();
              }
              //down arrow
              else if (e.keyCode === 40) {
                if (scope.showPrompt || scope.allowTypingWriteDisplaying)
                  scope.nextCommand();
                e.preventDefault();
              }
            });

            function type(input, line, i, endCallback) {
              setTimeout(function() {
                scope.typeSound();
                input.textContent += (i < line.length ? line[i] : '');

                if (i < line.length - 1) {
                  scope.typeSound();
                  type(input, line, i + 1, endCallback);
                }
                else if (endCallback)
                  endCallback();
              }, scope.outputDelay);
            }

            scope.$watchCollection(function() {
              return scope.results;
            }, function(newValues, oldValues) {

              if (oldValues.length && !newValues.length) { // removal detected
                var children = results.children();
                for (var i = 0; i < children.length; i++) {
                  children[i].remove();
                }
              }

              scope.showPrompt = false;
              var f = [function() {
                  scope.showPrompt = true;
                  scope.$$phase || scope.$apply();
                  consoleView[0].scrollTop = consoleView[0].scrollHeight;
                }];

              for (var j = 0; j < newValues.length; j++) {

                var newValue = newValues[j];
                if (newValue.displayed)
                  continue;

                newValue.displayed = true;

                if (scope.outputDelay) {

                  for (var i = newValue.text.length - 1; i >= 0; i--) {
                    var line = document.createElement('pre');
                    line.className = 'terminal-line';

                    var textLine = newValue.text[i];

                    if (scope.outputDelay && newValue.output) {
                      line.textContent = '';
                      var fi = f.length - 1;
                      var wrapper = function() {
                        var wline = line;
                        var wtextLine = textLine;
                        var wf = f[fi];
                        var wbreak = i == newValue.text.length - 1 && newValue.breakLine;
                        f.push(function() {
                          results[0].appendChild(wline);
                          type(wline, wtextLine, 0, wf);
                          consoleView[0].scrollTop = consoleView[0].scrollHeight;
                          if (wbreak) {
                            var breakLine = document.createElement('br');
                            results[0].appendChild(breakLine);
                          }
                        });
                      }();
                    }
                    else {
                      line.textContent = textLine;
                      results[0].appendChild(line)
                    }
                  }
                }
                else {
                  for (var i = 0; i < newValue.text.length; i++) {
                    var line = document.createElement('pre');
                    line.textContent = newValue.output ? '' : '';
                    line.className = 'terminal-line';
                    line.textContent += newValue.text[i];
                    results[0].appendChild(line)
                  }
                  if (!!newValue.breakLine) {
                    var breakLine = document.createElement('br');
                    results[0].appendChild(breakLine);
                  }
                }

              }
              f[f.length - 1]();
            });

          }
        }
      }
    }
  })
  ;