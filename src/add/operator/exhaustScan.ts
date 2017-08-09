
import { Observable } from '../../Observable';
import { exhaustScan } from '../../operator/exhaustScan';

Observable.prototype.exhaustScan = exhaustScan;

declare module '../../Observable' {
  interface Observable<T> {
    exhaustScan: typeof exhaustScan;
  }
}