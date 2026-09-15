import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = async (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('public detail route allows guests and hides bottom navigation', async () => {
  const router = await source('../src/route/router.js');
  assert.match(router, /path: "\/properties\/:propertyId"[\s\S]*?name: "property-detail"[\s\S]*?PropertyDetailPage\.vue[\s\S]*?meta: setMeta\(false, false\)/);
});

test('list card opens property 123 while map marker selection remains separate', async () => {
  const list = await source('../src/component/property/PropertyMapList.vue');
  const page = await source('../src/page/property/PropertyMapPage.vue');
  assert.match(list, /@click="emit\('open-property-detail', item\)"/);
  assert.match(page, /@open-property-detail="openPropertyDetail"/);
  assert.match(page, /router\.push\(toPropertyDetailLocation\(property\)\)/);
  const { toPropertyDetailLocation } = await import("../src/route/propertyDetailLocation.js");
  assert.equal(toPropertyDetailLocation({ propertyId: 123 }), "/properties/123");
  assert.match(page, /@select-property="handleMapPropertySelect"/);
});

test('detail API uses backend public endpoint through gateway', async () => {
  const api = await source('../src/api/propertyDetailApi.js');
  assert.match(api, /myAxios\.get\(`\/api\/properties\/\$\{encodeURIComponent\(String\(propertyId\)\)\}`\)/);
});

test('detail renders API price, public address, description, and image fallback', async () => {
  const page = await source('../src/page/property/PropertyDetailPage.vue');
  assert.match(page, /formatPropertyPrice\(detail/);
  assert.match(page, /detail\.publicAddress/);
  assert.match(page, /detail\.description/);
  assert.match(page, /detail\.value\?\.images/);
  assert.match(page, /이미지 없음/);
});

test('detail uses a routed section and labels direct tenant publisher', async () => {
  const page = await source('../src/page/property/PropertyDetailPage.vue');
  assert.match(page, /<section class="property-detail">/);
  assert.match(page, /DIRECT_TENANT: "세입자 직접 등록 매물"/);
});
