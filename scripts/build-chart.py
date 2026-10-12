"""Genera src/data/ria-coruna.json a partir de la línea de costa de OpenStreetMap.

Uso:
  curl -A "berguntin.dev" --data-urlencode 'data=[out:json];way["natural"="coastline"](43.30,-8.48,43.43,-8.18);out geom;' \
    https://maps.mail.ru/osm/tools/overpass/api/interpreter > coast.json
  python3 scripts/build-chart.py coast.json src/data/ria-coruna.json

Requiere shapely. Datos © colaboradores de OpenStreetMap (ODbL).
"""
import json, sys, math
from shapely.geometry import LineString, Point, box, MultiLineString
from shapely.ops import polygonize, unary_union, linemerge
src, out = sys.argv[1], sys.argv[2]
S,W,N,E = 43.315,-8.47,43.425,-8.215
d = json.load(open(src))
lat0 = math.radians((S+N)/2); k = math.cos(lat0)
def P(lon,lat): return ((lon-W)*k, (N-lat))   # x right, y down, equirectangular
lines = [LineString([P(g['lon'],g['lat']) for g in e['geometry']]) for e in d['elements'] if len(e['geometry'])>1]
frame = box(0,0,(E-W)*k,N-S)
coast = unary_union(lines).intersection(frame)
faces = list(polygonize(unary_union([coast, frame.exterior])))
sea_pt = Point(*P(-8.33,43.41))
land = [f for f in faces if not f.contains(sea_pt)]
sea = [f for f in faces if f.contains(sea_pt)]
print('faces', len(faces), 'land', len(land), 'sea', len(sea))
VW = 1200; s = VW/((E-W)*k); VH = round((N-S)*s)
def path(geom, tol):
    g = geom.simplify(tol/s, preserve_topology=True)
    polys = getattr(g,'geoms',[g])
    parts=[]
    for p in polys:
        for ring in [p.exterior, *p.interiors]:
            c = list(ring.coords)
            if len(c)<4: continue
            parts.append('M'+'L'.join(f'{x*s:.1f},{y*s:.1f}' for x,y in c[:-1])+'Z')
    return ''.join(parts)
landu = unary_union([f for f in land if f.area*s*s>4])
seag = frame.difference(landu)
iso = [landu.buffer(r/s).boundary.intersection(seag) for r in (14, 30)]
def lpath(g, tol):
    g = g.simplify(tol/s)
    ls = getattr(g,'geoms',[g]); o=[]
    for l in ls:
        c=list(l.coords)
        if len(c)>1: o.append('M'+'L'.join(f'{x*s:.1f},{y*s:.1f}' for x,y in c))
    return ''.join(o)
def proj(lon,lat):
    x,y=P(lon,lat); return [round(x*s,1), round(y*s,1)]
course = (-8.3716, 43.4057)
cx, cy = P(*course)
print('course clearance px', round(landu.distance(Point(cx,cy))*s,1))
res = dict(width=VW, height=VH, bbox=[S,W,N,E], land=path(landu,0.6),
  iso=[lpath(g,1.2) for g in iso],
  points={'torre':proj(-8.40655,43.38589), 'course':proj(*course)})
json.dump(res, open(out,'w'), separators=(',',':'))
print(VW, VH, len(res['land']), [len(i) for i in res['iso']], res['points'])
