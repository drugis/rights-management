var _ = require('lodash');

module.exports = {
  setRequiredRights: setRequiredRights,
  expressMiddleware: expressMiddleware
};

const RIGHTS_ENUM = {
  'none': 0,
  'read': 1,
  'write': 2,
  'owner': 3,
  'admin': 4
};
const VALID_RIGHTS = ['none', 'read', 'write', 'owner', 'admin'];
const VALID_METHODS = ['get', 'post', 'put', 'delete'];

const INVALID_RIGHTS_INPUT = 'Invalid rights input';
const INSUFFICIENT_USER_RIGHTS = 'Insufficient user rights';

var requiredRights;

function setRequiredRights(rights) {
  isArrayChecker(rights);
  var invalidInputFound = _(rights)
    .map(isArrayChecker)
    .some(([path, method, requiredRights, tooMuchInput]) => {
      return (tooMuchInput !== undefined) ||
        isInvalidPath(path) ||
        isInvalidMethod(method) ||
        isInvalidRights(requiredRights);
    });
  if (invalidInputFound) {
    throw INVALID_RIGHTS_INPUT;
  }
  requiredRights = rights;
}

function isArrayChecker(arg) {
  if (!Array.isArray(arg)) {
    throw INVALID_RIGHTS_INPUT;
  }
  return arg;
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
  if (isUnKnownPath(request)) {
    response.status(403).send(INSUFFICIENT_USER_RIGHTS);
  } else {
    var requiredRight = getRequiredRightsForPath(request);
    var minimumRightValue = RIGHTS_ENUM[requiredRight[2]];
    if (getUserRightValue(request) >= minimumRightValue) {
      next();
    } else {
      response.status(403).send(INSUFFICIENT_USER_RIGHTS);
    }
  }
}

function getRequiredRightsForPath(request) {
  return _.find(requiredRights, (requiredRight) => {
    return requiredRight[0] === request.route.path;
  });
}
function isUnKnownPath(request) {
  return !_.some(requiredRights, (right) => {
    return right[0] === request.route.path;
  });
}

function getUserRightValue(request) {
  return RIGHTS_ENUM.none;
}
