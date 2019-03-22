var _ = require('lodash');

module.exports = function(getAnalysis) {

  const VALID_RIGHTS = ['none', 'read', 'write', 'owner', 'admin'];
  const VALID_METHODS = ['GET', 'POST', 'PUT', 'DELETE'];

  const INVALID_RIGHTS_INPUT = 'Invalid rights input';
  const INSUFFICIENT_USER_RIGHTS = 'Insufficient user rights';

  var requiredRights;

  function setRequiredRights(rights) {
    var invalidInputFound = _.some(rights, ({ path, method, requiredRight }) => {
      return isInvalidPath(path) ||
        isInvalidMethod(method) ||
        isInvalidRights(requiredRight);
    });
    if (invalidInputFound) {
      throw INVALID_RIGHTS_INPUT;
    }
    requiredRights = rights;
  }

  function isInvalidPath(path) {
    return typeof path !== 'string';
  }

  function isInvalidMethod(method) {
    return !_.includes(VALID_METHODS, method);
  }

  function isInvalidRights(rights) {
    return !_.includes(VALID_RIGHTS, rights);
  }

  function expressMiddleware(request, response, next) {
    var configForRequest = getConfig(request);
    if (!configForRequest) {
      response.status(403).send(INSUFFICIENT_USER_RIGHTS);
    } else if (configForRequest.requiredRight === 'none') {
      next();
    } else {
      var analysisId = Number.parseInt(request.params.analysisId);
      var userId = request.user.id;

      getAnalysis(analysisId, (analysis) => {
        if (analysis.owner !== userId) {
          response.status(403).send(INSUFFICIENT_USER_RIGHTS);
        } else {
          next();
        }
      });
    }
  }

  function getConfig(request) {
    return _.find(requiredRights, ({path, method}) => {
      return path === request.route.path &&
        method === request.method;
    });
  }

  return {
    setRequiredRights: setRequiredRights,
    expressMiddleware: expressMiddleware
  };
}
