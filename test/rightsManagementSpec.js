var chai = require('chai');
var expect = chai.expect;
var spies = require('chai-spies');
var rightsManagement = require('../index');

describe('the rights managament module', () => {
  chai.use(spies);

  describe('setRequiredRights', () => {
    it('should fail if the input is not an array', () => {
      var rights = {};
      expect(() => { rightsManagement.setRequiredRights(rights); }).to.throw('Invalid rights input');
    });

    it('should fail for incorrect permission', () => {
      var malformedRights = [
        ['/', 'put', 123]
      ];
      expect(() => { rightsManagement.setRequiredRights(malformedRights); }).to.throw('Invalid rights input');
      var incorrectRights = [
        ['/', 'put', 'toRemainSilent']
      ];
      expect(() => { rightsManagement.setRequiredRights(incorrectRights); }).to.throw('Invalid rights input');
    });

    it('should allow an empty array', () => {
      var rights = [];
      rightsManagement.setRequiredRights(rights);
    });

    it('should allow an array with valid triples', () => {
      var rights = [
        ['/', 'get', 'read'],
        ['/', 'post', 'admin'],
        ['/', 'put', 'owner'],
        ['/', 'delete', 'none'],
        ['/', 'get', 'admin'],
        ['/', 'put', 'write']
      ];
      rightsManagement.setRequiredRights(rights);
    });

    it('should fail when the input contains an incorrect method', () => {
      var rights = [
        ['/', 'get', 'write'],
        ['/', 'grab', 'read']];
      expect(() => { rightsManagement.setRequiredRights(rights); }).to.throw('Invalid rights input');
    });

    it('should fail when the input contains an incorrect path', () => {
      var rights = [
        [123, 'get', 'write'],
        ['/', 'post', 'read']];
      expect(() => { rightsManagement.setRequiredRights(rights); }).to.throw('Invalid rights input');
    });

    it('should fail for incorrectly-sized triples', () => {
      var tooSmall = [['/', 'get']];
      expect(() => { rightsManagement.setRequiredRights(tooSmall); }).to.throw('Invalid rights input');
      var tooLarge = [['/', 'get', 'read', 'sup guys']];
      expect(() => { rightsManagement.setRequiredRights(tooLarge); }).to.throw('Invalid rights input');
    });

    it('should fail if the triples are not arrays', () => {
      var notArray = [{ method: 'put', path: '/', permission: 'read' }];
      expect(() => { rightsManagement.setRequiredRights(notArray); }).to.throw('Invalid rights input');
    });
  });
  describe('expressMiddleware', () => {
    describe('for a valid configuration', () => {
      beforeEach(() => {
        rightsManagement.setRequiredRights([
          ['/analyses', 'get', 'none'],
          ['/analyses/:analysisId', 'get', 'read'],
          ['/analyses//:analysisId/setPrimaryModel', 'post', 'write'],
          ['/analyses/:analysisId/models', 'get', 'read'],
          ['/analyses/:analysisId/models', 'post', 'write'],
          ['/analyses/:analysisId/models/:modelId/baseline', 'put', 'write'],
          ['/analyses/:analysisId/models/:modelId/funnelPlots/:plotId', 'get', 'read']
        ]);
      });
      it('should not permit requests to unknown paths', () => {
        var request = {
          method: 'GET',
          route: {
            path: '/spurious/:fakeId'
          }
        };
        var response = {
          status: chai.spy()
        };
        response.status.send = chai.spy();
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).not.to.have.been.called();
        expect(response.status).to.have.been.called.with(403);
        expect(response.status.send).to.have.been.called.with('Insufficient user rights');
      });
      it('it should permit any request requiring "none" rights', () => {
        var request = {
          method: 'GET',
          route: {
            path: '/analyses'
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });
    });
  });
});
