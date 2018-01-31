import { SegmentConverter } from '../';
import { QueryBody } from '../../search-engine/index';
import { Field } from '../../model/index';
import { SelectorSegmentConverterBase } from './selector-segment-converter-base';
import { TextQueryBuilder, TimeQueryValueBuilder, RangeQueryBuilder, TermQueryBuilder } from '../../search-engine/query/builder';
import { RangeParser, Range, RangeType } from '../parsers/range';
import { TimeParser } from '../parsers/time';

const SELECTOR_REGEX = /^du(r(a(t(i(o(n)?)?)?)?)?)?$/;

const RANGE_INCLUSIVE = true;

export class DurationSegmentConverter extends SelectorSegmentConverterBase implements SegmentConverter {
  private readonly rangeParser: RangeParser;
  private readonly timeParser: TimeParser;

  constructor() {
    super(SELECTOR_REGEX);

    this.rangeParser = new RangeParser(RANGE_INCLUSIVE);
    this.timeParser = new TimeParser();
  }

  protected textToQuery(text: string): QueryBody | null {
    const ranges = this.rangeParser.parse(text);

    if (ranges == null) {
      return null;
    } else if (ranges.length == 1) {
      return this.convertSingle(ranges[0]);
    } else if (ranges.length == 2) {
      return this.convertFromTo(ranges[0], ranges[1]);
    } else {
      throw new Error(`did not expected a range count of ${ranges.length}`);
    }
  }

  private convertSingle(range: Range): QueryBody | null {
    const time = this.timeParser.parse(range.text);

    let queryBuilder: TermQueryBuilder | RangeQueryBuilder;

    switch (range.type) {
      case RangeType.Equals:
        const termQueryBuilder = new TermQueryBuilder();
        const time = this.timeParser.parse(range.text);
        termQueryBuilder.value(time);
        queryBuilder = termQueryBuilder;

        break;

      default:
        const rangeQueryBuilder = new RangeQueryBuilder();
        this.setRange(rangeQueryBuilder, range);
        queryBuilder = rangeQueryBuilder;

        break;
    }

    queryBuilder.field(Field.Channel);

    const query = queryBuilder.build();
    return query;
  }

  private convertFromTo(from: Range, to: Range): QueryBody | null {
    const rangeQueryBuilder = new RangeQueryBuilder();
    rangeQueryBuilder.field(Field.Channel);

    this.setRange(rangeQueryBuilder, from);
    this.setRange(rangeQueryBuilder, to);

    const query = rangeQueryBuilder.build();
    return query;
  }

  private setRange(rangeQueryBuilder: RangeQueryBuilder, range: Range) {
    const time = this.timeParser.parse(range.text);

    switch (range.type) {
      case RangeType.Greater:
        rangeQueryBuilder.gt(time);
        break;
      case RangeType.GreaterEquals:
        rangeQueryBuilder.gte(time);
        break;
      case RangeType.Less:
        rangeQueryBuilder.lt(time);
        break;
      case RangeType.LessEquals:
        rangeQueryBuilder.lte(time);
        break;

      default:
        throw new Error('should not happen');
    }
  }
}