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
        ['/', 'GET', 'read'],
        ['/', 'POST', 'admin'],
        ['/', 'PUT', 'owner'],
        ['/', 'DELETE', 'none'],
        ['/', 'GET', 'admin'],
        ['/', 'PUT', 'write']
      ];
      rightsManagement.setRequiredRights(rights);
    });

    it('should fail when the input contains an incorrect method', () => {
      var rights = [
        ['/', 'GET', 'write'],
        ['/', 'grab', 'read']];
      expect(() => { rightsManagement.setRequiredRights(rights); }).to.throw('Invalid rights input');
    });

    it('should fail when the input contains an incorrect path', () => {
      var rights = [
        [123, 'GET', 'write'],
        ['/', 'POST', 'read']];
      expect(() => { rightsManagement.setRequiredRights(rights); }).to.throw('Invalid rights input');
    });

    it('should fail for incorrectly-sized triples', () => {
      var tooSmall = [['/', 'GET']];
      expect(() => { rightsManagement.setRequiredRights(tooSmall); }).to.throw('Invalid rights input');
      var tooLarge = [['/', 'GET', 'read', 'sup guys']];
      expect(() => { rightsManagement.setRequiredRights(tooLarge); }).to.throw('Invalid rights input');
    });

    it('should fail if the triples are not arrays', () => {
      var notArray = [{ method: 'PUT', path: '/', permission: 'read' }];
      expect(() => { rightsManagement.setRequiredRights(notArray); }).to.throw('Invalid rights input');
    });
  });

  describe('expressMiddleware', () => {
    describe('for a valid configuration', () => {
      beforeEach(() => {
        rightsManagement.setRequiredRights([
          ['/analyses', 'GET', 'none'],
          ['/analyses', 'DELETE', 'owner'],
          ['/analyses/:analysisId', 'GET', 'read'],
          ['/analyses/:analysisId/setPrimaryModel', 'POST', 'write'],
          ['/analyses/:analysisId/models', 'GET', 'read'],
          ['/analyses/:analysisId/models', 'POST', 'admin'],
          ['/analyses/:analysisId/models/:modelId/baseline', 'PUT', 'write'],
          ['/analyses/:analysisId/models/:modelId/funnelPlots/:plotId', 'GET', 'read']
        ]);
      });

      it('should not permit requests to unknown paths', () => {
        var request = {
          method: 'GET',
          route: {
            path: '/spurious/:fakeId'
          }
        };
        var status = {
          send: chai.spy()
        };
        var response = {
          status: chai.spy(returns => status)
        };
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(response.status).to.have.been.called.with(403);
        expect(status.send).to.have.been.called.with('Insufficient user rights');
        expect(next).not.to.have.been.called();
      });

      it('should not allow methods which are not available for the path', ()=>{
        var request = {
          method: 'POST',
          route: {
            path: '/analyses'
          }
        };
        var status = {
          send: chai.spy()
        };
        var response = {
          status: chai.spy(returns => status)
        };
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(response.status).to.have.been.called.with(403);
        expect(status.send).to.have.been.called.with('Insufficient user rights');
        expect(next).not.to.have.been.called();
      });

      it('should permit any request requiring "none" rights', () => {
        var request = {
          method: 'GET',
          route: {
            path: '/analyses'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should permit read requests if the user has atleast read access', () => {
        var request = {
          method: 'GET',
          route: {
            path: '/analyses/:analysisId'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should permit write requests if the user has atleast write access', () => {
        var request = {
          method: 'POST',
          route: {
            path: '/analyses/:analysisId/setPrimaryModel'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should permit owner requests if the user has atleast owner access', () => {
        var request = {
          method: 'DELETE',
          route: {
            path: '/analyses'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should permit owner requests if the user has atleast owner access', () => {
        var request = {
          method: 'DELETE',
          route: {
            path: '/analyses'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should permit admin requests if the user has admin rights', () => {
        var request = {
          method: 'POST',
          route: {
            path: '/analyses/:analysisId/models'
          },
          user: {
            id: 1
          }
        };
        var response = {};
        var next = chai.spy();
        rightsManagement.expressMiddleware(request, response, next);
        expect(next).to.have.been.called();
      });

      it('should not permit no "read" request if the user has no rights', ()=>{

      });

      it('should not permit no "write" request if the user has not enought rights', ()=>{

        
      });

      it('should not permit no "owner" request if the user has not enought rights', ()=>{
        
      });

      it('should not permit no "admin" request if the user has not enought rights', ()=>{
        
      });
    });
  });
});
