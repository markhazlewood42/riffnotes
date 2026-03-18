import { computeStackedLayout, ANNOTATION_GAP } from '../src/hooks/useAnnotationLayout.js';

describe('computeStackedLayout', () => {
  test('empty input returns empty layout map', () => {
    expect(computeStackedLayout([])).toEqual({});
  });

  test('single annotation returns entry with no displacement', () => {
    const entries = [{ lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 }];
    const layout = computeStackedLayout(entries);
    expect(layout.a.top).toBe(100);
    expect(layout.a.displacement).toBe(0);
    expect(layout.a.height).toBe(40);
    expect(layout.a.lineTop).toBe(100);
  });

  test('non-overlapping annotations have no displacement', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 },
      { lineId: 'b', naturalTop: 200, height: 40, lineTop: 200 },
    ];
    const layout = computeStackedLayout(entries);
    expect(layout.a.displacement).toBe(0);
    expect(layout.b.displacement).toBe(0);
    expect(layout.b.top).toBe(200);
  });

  test('two overlapping entries: second is pushed down', () => {
    // a: top=100, height=60 → bottom=160. b: naturalTop=130 → overlap.
    // b placed at 160 + ANNOTATION_GAP
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 60, lineTop: 100 },
      { lineId: 'b', naturalTop: 130, height: 40, lineTop: 130 },
    ];
    const layout = computeStackedLayout(entries);
    const expectedBTop = 100 + 60 + ANNOTATION_GAP;
    expect(layout.a.top).toBe(100);
    expect(layout.b.top).toBe(expectedBTop);
    expect(layout.b.displacement).toBe(expectedBTop - 130);
  });

  test('cascading push-down: third entry pushed by second', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 50, lineTop: 100 },
      { lineId: 'b', naturalTop: 120, height: 50, lineTop: 120 },
      { lineId: 'c', naturalTop: 140, height: 50, lineTop: 140 },
    ];
    const layout = computeStackedLayout(entries);
    const bTop = 100 + 50 + ANNOTATION_GAP;
    const cTop = bTop + 50 + ANNOTATION_GAP;
    expect(layout.a.top).toBe(100);
    expect(layout.b.top).toBe(bTop);
    expect(layout.c.top).toBe(cTop);
  });

  test('gap between entries resets the stack', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 40, lineTop: 100 },
      { lineId: 'b', naturalTop: 500, height: 40, lineTop: 500 }, // far below
    ];
    const layout = computeStackedLayout(entries);
    expect(layout.a.displacement).toBe(0);
    expect(layout.b.displacement).toBe(0);
    expect(layout.b.top).toBe(500);
  });

  test('ANNOTATION_GAP constant is respected between stacked entries', () => {
    const entries = [
      { lineId: 'a', naturalTop: 100, height: 50, lineTop: 100 },
      { lineId: 'b', naturalTop: 145, height: 50, lineTop: 145 }, // 5px overlap
    ];
    const layout = computeStackedLayout(entries);
    const actualGap = layout.b.top - (layout.a.top + 50);
    expect(actualGap).toBe(ANNOTATION_GAP);
  });
});
