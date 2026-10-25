// Strips the animations out of a .glb and repacks only the data its meshes, skins and textures still use.
// The KayKit characters share one skeleton (same bone names), so one file carries the clips and the others
// can drop theirs: each goes from ~3.6 MB to a few hundred KB.
// usage: node tools/strip-glb-animations.js in.glb out.glb
const fs = require('fs');
const [src, dst] = process.argv.slice(2);
const buf = fs.readFileSync(src);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8, bin = buf.slice(binStart, binStart + buf.readUInt32LE(20 + jsonLen));

delete json.animations;
// accessors still referenced: mesh attributes, indices, morph targets, skin matrices
const usedAcc = new Set();
for (const m of json.meshes || []) for (const p of m.primitives) {
  Object.values(p.attributes).forEach(a => usedAcc.add(a));
  if (p.indices !== undefined) usedAcc.add(p.indices);
  (p.targets || []).forEach(t => Object.values(t).forEach(a => usedAcc.add(a)));
}
for (const s of json.skins || []) if (s.inverseBindMatrices !== undefined) usedAcc.add(s.inverseBindMatrices);
const usedBV = new Set([...usedAcc].map(a => json.accessors[a].bufferView));
for (const im of json.images || []) if (im.bufferView !== undefined) usedBV.add(im.bufferView);

// repack the kept buffer views, 4-byte aligned, and renumber everything that points at them
const bvMap = new Map(), parts = []; let off = 0;
const views = [];
[...usedBV].sort((a, b) => a - b).forEach(i => {
  const v = json.bufferViews[i], data = bin.slice(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
  const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
  bvMap.set(i, views.length); views.push({ ...v, byteOffset: off }); parts.push(data); off += v.byteLength;
});
const accMap = new Map(), accessors = [];
[...usedAcc].sort((a, b) => a - b).forEach(i => { accMap.set(i, accessors.length); accessors.push({ ...json.accessors[i], bufferView: bvMap.get(json.accessors[i].bufferView) }); });
json.bufferViews = views; json.accessors = accessors;
for (const m of json.meshes || []) for (const p of m.primitives) {
  for (const k of Object.keys(p.attributes)) p.attributes[k] = accMap.get(p.attributes[k]);
  if (p.indices !== undefined) p.indices = accMap.get(p.indices);
  (p.targets || []).forEach(t => { for (const k of Object.keys(t)) t[k] = accMap.get(t[k]); });
}
for (const s of json.skins || []) if (s.inverseBindMatrices !== undefined) s.inverseBindMatrices = accMap.get(s.inverseBindMatrices);
for (const im of json.images || []) if (im.bufferView !== undefined) im.bufferView = bvMap.get(im.bufferView);
const newBin = Buffer.concat([...parts, Buffer.alloc((4 - (off % 4)) % 4)]);
json.buffers = [{ byteLength: newBin.length }];

let js = Buffer.from(JSON.stringify(json), 'utf8');
js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + js.length + 8 + newBin.length, 8);
const ch = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.writeUInt32LE(type, 4); return h; };
fs.writeFileSync(dst, Buffer.concat([header, ch(js.length, 0x4e4f534a), js, ch(newBin.length, 0x004e4942), newBin]));
console.log(`${src} → ${dst}: ${(buf.length / 1e6).toFixed(2)} MB → ${(fs.statSync(dst).size / 1e6).toFixed(2)} MB`);
