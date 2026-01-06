export class ErrWithStatus extends Error{
  constructor(msg, status){
    super(msg);
    this.status = status;
  }
}