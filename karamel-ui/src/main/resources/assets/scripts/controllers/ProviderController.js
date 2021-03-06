/**
 * Created by babbarshaer on 2014-11-25.
 */
// Controller for different providers.

angular.module("demoApp")
    .controller('AmazonProviderController', ['$log', '$scope', '$modalInstance', 'info', 'KaramelCoreRestServices', function($log, $scope, $modalInstance, info, KaramelCoreRestServices) {

        function initScope(scope) {


          scope.account = {
            accountId: null,
            accountKey: null
          };

          KaramelCoreRestServices.loadCredentials()
              .success(function(data) {
                scope.account.accountId = data.accountId;
                scope.account.accountKey = data.accountKey;
              })
              .error(function(data) {
                $log.warn("No Ec2 credentials is available");
              });



          scope.states = {
            valid: "valid",
            invalid: "invalid",
            initial: "initial"
          };


          scope.connectionState = scope.states.initial;

          var container = null;

          if (!(_.isNull(info.group) || _.isUndefined(info.group))) {
            container = info.group;
          }
          else {
            container = info.board;
          }

        }

        $scope.close = function() {
          $modalInstance.close();
        };

        $scope.addOrUpdateProvider = function() {
          if (this.ec2ProviderForm.$valid) {
            $modalInstance.close({ec2Provider: $scope.account});
          }
        };


        $scope.testConnection = function() {

          // Reset the Connection State.
          $scope.connectionState = $scope.states.initial;

          // If basic validations passed, then move forward.
          if (this.ec2ProviderForm.accountId.$valid && this.ec2ProviderForm.accountKey.$valid) {

            validate($scope.account)
                .success(function(data, status, header, config) {
                  $scope.connectionState = $scope.states.valid;
                })
                .error(function(data, status, header, config) {
                  $scope.connectionState = $scope.states.invalid;
                })
          }

        };


        function validate(account) {
          return KaramelCoreRestServices.validateCredentials(account);
        }


        initScope($scope);
      }])
    .directive('accountCredentialsValidator', ['$log', '$scope', 'KaramelCoreRestServices', function($log, $scope, KaramelCoreRestServices) {

        // ===== WIP.
        return {
        }


      }]);