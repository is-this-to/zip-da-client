/**
 * 화면 좌표상 가까운 지도 항목을 하나의 그룹으로 묶는다.
 *
 * 지도 SDK나 상태를 직접 참조하지 않는 순수 함수로 유지하여
 * 다른 종류의 지도 마커에도 재사용할 수 있도록 한다.
 */
export const groupNearbyMapItems = (
  positionedItems,
  maximumDistancePixels = 60,
) => {
  if (!Array.isArray(positionedItems) || positionedItems.length === 0) {
    return [];
  }

  const validItems = positionedItems.filter(
    ({ item, x, y }) =>
      item && Number.isFinite(x) && Number.isFinite(y),
  );

  const parents = validItems.map((_, index) => index);
  const findRoot = (index) => {
    let root = index;

    while (parents[root] !== root) {
      root = parents[root];
    }

    while (parents[index] !== index) {
      const parent = parents[index];
      parents[index] = root;
      index = parent;
    }

    return root;
  };
  const merge = (leftIndex, rightIndex) => {
    const leftRoot = findRoot(leftIndex);
    const rightRoot = findRoot(rightIndex);

    if (leftRoot !== rightRoot) {
      parents[rightRoot] = leftRoot;
    }
  };
  const maximumDistanceSquared = maximumDistancePixels ** 2;

  for (let leftIndex = 0; leftIndex < validItems.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < validItems.length;
      rightIndex += 1
    ) {
      const horizontalDistance =
        validItems[leftIndex].x - validItems[rightIndex].x;
      const verticalDistance =
        validItems[leftIndex].y - validItems[rightIndex].y;

      if (
        horizontalDistance ** 2 + verticalDistance ** 2 <=
        maximumDistanceSquared
      ) {
        merge(leftIndex, rightIndex);
      }
    }
  }

  const groupsByRoot = new Map();

  validItems.forEach(({ item }, index) => {
    const root = findRoot(index);
    const group = groupsByRoot.get(root) ?? [];

    group.push(item);
    groupsByRoot.set(root, group);
  });

  return [...groupsByRoot.values()];
};
