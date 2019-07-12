import { Document } from 'mongoose';

export function renameId(doc: Document, ret: any): any {
  ret.id = ret._id;
  delete ret._id;
  return ret;
}
