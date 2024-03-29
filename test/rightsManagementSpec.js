var chai = require('chai');
var expect = chai.expect;
var spies = require('chai-spies');
var sinon = require('sinon');

describe('the rights managament module', () => {
  chai.use(spies);
  var analysis = {};
  var rightsManagement;
  const ownedAnalysisId = 1;

  function requireOwnership(response, next, analysisId) {
    if (analysisId === ownedAnalysisId) {
      next();
    } else {
      response.status(403).send('Insufficient user rights');
    }
  }

  beforeEach(() => {
    var getAnalysis = sinon.fake.yields(null, analysis);
    rightsManagement = require('../index')(getAnalysis);
  });

  describe('setRequiredRights', () => {
    it('should fail for invalid requiredRight', () => {
      var malformedRights = [
        {
          path: '/',
          method: 'PUT',
          requiredRight: 123
        }
      ];
      expect(() => {
        rightsManagement.setRequiredRights(malformedRights);
      }).to.throw('Invalid rights input');
      var incorrectRights = [
        {
          path: '/',
          method: 'PUT',
          requiredRight: 'toRemainSilent'
        }
      ];
      expect(() => {
        rightsManagement.setRequiredRights(incorrectRights);
      }).to.throw('Invalid rights input');
    });

    it('should allow an empty array', () => {
      var rights = [];
      rightsManagement.setRequiredRights(rights);
    });

    it('should allow valid triples', () => {
      var rights = [
        {
          path: '/',
          method: 'GET',
          requiredRight: 'read',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'POST',
          requiredRight: 'admin',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'PUT',
          requiredRight: 'owner',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'DELETE',
          requiredRight: 'none',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'GET',
          requiredRight: 'admin',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'PUT',
          requiredRight: 'write',
          checkRights: requireOwnership
        }
      ];
      rightsManagement.setRequiredRights(rights);
    });

    it('should fail when the input contains an incorrect method', () => {
      var rights = [
        {
          path: '/',
          method: 'GET',
          requiredRight: 'write',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'grab',
          requiredRight: 'read',
          checkRights: requireOwnership
        }
      ];
      expect(() => {
        rightsManagement.setRequiredRights(rights);
      }).to.throw('Invalid rights input');
    });

    it('should fail when the input contains an incorrect path', () => {
      var rights = [
        {
          path: 123,
          method: 'GET',
          requiredRight: 'write',
          checkRights: requireOwnership
        },
        {
          path: '/',
          method: 'POST',
          requiredRight: 'read',
          checkRights: requireOwnership
        }
      ];
      expect(() => {
        rightsManagement.setRequiredRights(rights);
      }).to.throw('Invalid rights input');
    });

    it('should fail for incorrectly-sized triples', () => {
      var tooSmall = [
        {
          path: '/',
          method: 'GET'
        }
      ];
      expect(() => {
        rightsManagement.setRequiredRights(tooSmall);
      }).to.throw('Invalid rights input');
    });
  });

  describe('expressMiddleware', () => {
    var next;
    var status;
    var response;
    beforeEach(() => {
      rightsManagement.setRequiredRights([
        {
          path: '/analyses',
          method: 'GET',
          requiredRight: 'none',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId',
          method: 'DELETE',
          requiredRight: 'owner',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId',
          method: 'GET',
          requiredRight: 'read',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId/setPrimaryModel',
          method: 'POST',
          requiredRight: 'write',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId/models',
          method: 'GET',
          requiredRight: 'read',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId/models',
          method: 'POST',
          requiredRight: 'admin',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId/models/:modelId/baseline',
          method: 'PUT',
          requiredRight: 'write',
          checkRights: requireOwnership
        },
        {
          path: '/analyses/:analysisId/models/:modelId/funnelPlots/:plotId',
          method: 'GET',
          requiredRight: 'read',
          checkRights: requireOwnership
        }
      ]);
      Object.keys(analysis).forEach((key) => {
        delete analysis[key];
      });

      next = chai.spy();

      status = {
        send: chai.spy()
      };
      response = {
        status: chai.spy(() => status)
      };
    });

    function expectAllowed() {
      expect(response.status).not.to.have.been.called();
      expect(status.send).not.to.have.been.called();
      expect(next).to.have.been.called();
    }

    function expectInsufficientRights() {
      expect(response.status).to.have.been.called.with(403);
      expect(status.send).to.have.been.called.with('Insufficient user rights');
      expect(next).not.to.have.been.called();
    }

    it('should not permit requests to unknown paths', () => {
      var request = {
        method: 'GET',
        url: '/spurious/:fakeId'
      };
      rightsManagement.expressMiddleware(request, response, next);
      expectInsufficientRights();
    });

    it('should not allow methods which are not available for the path', () => {
      var request = {
        method: 'POST',
        url: '/analyses'
      };
      rightsManagement.expressMiddleware(request, response, next);
      expectInsufficientRights();
    });

    it('should permit any request requiring "none" rights', () => {
      var request = {
        method: 'GET',
        url: '/analyses'
      };
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });

    it('should permit read requests for owned analyses', () => {
      var request = {
        method: 'GET',
        url: '/analyses/1',
        user: {
          id: 'ownerId'
        }
      };
      analysis.owner = 'ownerId';
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });

    it('should permit write requests for owned analyses', () => {
      var request = {
        method: 'POST',
        url: '/analyses/1/setPrimaryModel',
        user: {
          id: 'ownerId'
        }
      };
      analysis.owner = 'ownerId';
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });

    it('should permit owner requests for owned analyses', () => {
      var request = {
        method: 'DELETE',
        url: '/analyses/1',
        user: {
          id: 'ownerId'
        }
      };
      analysis.owner = 'ownerId';
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });

    it('should permit admin requests for owned analyses', () => {
      var request = {
        method: 'POST',
        url: '/analyses/1/models',
        user: {
          id: 'ownerId'
        }
      };
      analysis.owner = 'ownerId';
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });

    it('should not permit any request for not-owned analyses', () => {
      var request = {
        method: 'GET',
        url: '/analyses/2',
        user: {
          id: 'ownerId'
        }
      };
      rightsManagement.expressMiddleware(request, response, next);
      expectInsufficientRights();
    });

    it('should ignore query parameters', () => {
      var request = {
        method: 'POST',
        url: '/analyses/1/setPrimaryModel?modelId=32',
        user: {
          id: 'ownerId'
        }
      };
      analysis.owner = 'ownerId';
      rightsManagement.expressMiddleware(request, response, next);
      expectAllowed();
    });
  });
});
