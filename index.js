var _ = require('lodash');

module.exports = {
  setRequiredRights: setRequiredRights,
  expressMiddleware: expressMiddleware
};

const VALID_RIGHTS = ['none', 'read', 'write', 'owner', 'admin'];
const VALID_METHODS = ['get', 'post', 'put', 'delete'];
const INVALID_RIGHTS_INPUT ='Invalid rights input';

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
}

function expressMiddleware(request, response, next) {
  next();
}
