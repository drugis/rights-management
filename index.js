var _ = require('lodash');
var p2r = require('path-to-regexp');
var url = require('url');

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
    requiredRights = _.map(rights, (rightsEntry) => {
      return _.extend({}, rightsEntry, {
        pathRegex: p2r(rightsEntry.path)
      });
    });
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
    const urlWithoutParams = url.parse(request.url).pathname;
    var configForRequest = getConfig(urlWithoutParams, request.method);
    if (!configForRequest) {
      response.status(403).send(INSUFFICIENT_USER_RIGHTS);
    } else if (configForRequest.requiredRight === 'none') {
      next();
    } else {
      var analysisId = Number.parseInt(configForRequest.pathRegex.exec(urlWithoutParams)[1]);
      var userId = request.user.id;

      getAnalysis(analysisId, (error, analysis) => {
        if (error) { next(error); }
        if (analysis.owner !== userId) {
          response.status(403).send(INSUFFICIENT_USER_RIGHTS);
        } else {
          next();
        }
      });
    }
  }

  function getConfig(urlWithoutParams, requestMethod) {
    return _.find(requiredRights, ({ pathRegex, method }) => {
      return pathRegex.test(urlWithoutParams) &&
        method === requestMethod;
    });
  }

  return {
    setRequiredRights: setRequiredRights,
    expressMiddleware: expressMiddleware
  };
}
