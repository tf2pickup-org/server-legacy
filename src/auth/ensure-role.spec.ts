import { Request, Response } from 'express';
import { ensureRole } from './ensure-role';

describe('ensureRole middleware', () => {
  describe('should call next() once', () => {
    it('for admin', () => {
      const mw = ensureRole('admin');
      const spy = jasmine.createSpy();
      mw({ user: { role: 'admin' }} as unknown as Request, { } as unknown as Response, spy);
      expect(spy).toHaveBeenCalled();
    });

    it('for super-user', () => {
      const mw = ensureRole('super-user');
      const spy = jasmine.createSpy();
      mw({ user: { role: 'super-user' }} as unknown as Request, { } as unknown as Response, spy);
      expect(spy).toHaveBeenCalled();
    });
  });

  it('should deny without role', () => {
    const mw = ensureRole('admin');
    const response = { status: () => response, send: () => response } as unknown as Response;
    const spy1 = spyOn(response, 'status').and.callThrough();
    const spy2 = spyOn(response, 'send').and.callThrough();
    mw({ user: { } } as unknown as Request, response, () => { });

    expect(spy1).toHaveBeenCalledWith(403);
    expect(spy2).toHaveBeenCalledWith('Forbidden');
  });
});
