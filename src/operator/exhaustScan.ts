import { Operator } from '../Operator';
import { Observable } from '../Observable';
import { Subscriber } from '../Subscriber';
import { Subscription } from '../Subscription';
import { tryCatch } from '../util/tryCatch';
import { errorObject } from '../util/errorObject';
import { subscribeToResult } from '../util/subscribeToResult';
import { OuterSubscriber } from '../OuterSubscriber';
import { InnerSubscriber } from '../InnerSubscriber';

/**
 * Applies an accumulator function over the source Observable where the
 * accumulator function itself returns an Observable. A value emitted by the source
 * Observable is ignored while the current nested Observable has not yet completed.
 * Each intermediate Observable returned is merged into the output Observable.
 *
 * <span class="informal">It's like {@link scan}, but the Observables returned
 * by the accumulator are merged into the outer Observable.</span>
 *
 * @example <caption>Count the number of click events</caption>
 * const values$ = Rx.Observable.of(1, 2).concat(Rx.Observable.of(4, 8).delay(30));
 * const seed = 0;
 * const count$ = one$.exhaustScan((acc, one) => Rx.Observable.of(acc + one).delay(20), seed);
 * count$.subscribe(x => console.log(x));
 *
 * // Results:
 * 1
 * 5
 * 13
 *
 * @param {function(acc: R, value: T): Observable<R>} accumulator
 * The accumulator function called on each source value.
 * @param seed The initial accumulation value.
 * @return {Observable<R>} An observable of the accumulated values.
 * @method exhaustScan
 * @owner Observable
 */
export function exhaustScan<T, R>(this: Observable<T>,
                                  accumulator: (acc: R, value: T) => Observable<R>,
                                  seed: R): Observable<R> {
  return this.lift(new ExhaustScanOperator(accumulator, seed));
}

export class ExhaustScanOperator<T, R> implements Operator<T, R> {
  constructor(private accumulator: (acc: R, value: T) => Observable<R>,
              private seed: R) {
  }

  call(subscriber: Subscriber<R>, source: any): any {
    return source.subscribe(new ExhaustScanSubscriber(
      subscriber, this.accumulator, this.seed
    ));
  }
}

/**
 * We need this JSDoc comment for affecting ESDoc.
 * @ignore
 * @extends {Ignored}
 */
export class ExhaustScanSubscriber<T, R> extends OuterSubscriber<T, R> {
  private hasValue: boolean = false;
  private hasCompleted: boolean = false;
  private hasSubscription: boolean = false;
  protected index: number = 0;

  constructor(destination: Subscriber<R>,
              private accumulator: (acc: R, value: T) => Observable<R>,
              private acc: R) {
    super(destination);
  }

  protected _next(value: any): void {
    if (!this.hasSubscription) {
      const index = this.index++;
      const ish = tryCatch(this.accumulator)(this.acc, value);
      const destination = this.destination;
      if (ish === errorObject) {
        destination.error(errorObject.e);
      } else {
        this.hasSubscription = true;
        this.add(subscribeToResult<T, R>(this, ish, value, index));
      }
    }
  }

  protected _complete(): void {
    this.hasCompleted = true;
    if (!this.hasSubscription) {
      if (this.hasValue === false) {
        this.destination.next(this.acc);
      }
      this.destination.complete();
    }
  }

  notifyNext(outerValue: T, innerValue: R,
             outerIndex: number, innerIndex: number,
             innerSub: InnerSubscriber<T, R>): void {
    const { destination } = this;
    this.acc = innerValue;
    this.hasValue = true;
    destination.next(innerValue);
  }

  notifyComplete(innerSub: Subscription): void {
    this.remove(innerSub);
    this.hasSubscription = false;

     if (this.hasCompleted) {
      if (this.hasValue === false) {
        this.destination.next(this.acc);
      }
      this.destination.complete();
    }
  }
}
