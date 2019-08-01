import { Document, model, Schema } from 'mongoose';

export interface IRefreshToken extends Document {
  value: string;
  createdAt: Date;
}

const refreshTokenSchema: Schema = new Schema({
  value:  { type: Schema.Types.String, required: true },
  createdAt: { type: Schema.Types.Date },
});

refreshTokenSchema.pre('save', function(next) {
  const self = this as IRefreshToken;
  if (!self.createdAt) {
    self.createdAt = new Date();
  }

  next();
});

const refreshTokenDb = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
export { refreshTokenDb as RefreshToken };
