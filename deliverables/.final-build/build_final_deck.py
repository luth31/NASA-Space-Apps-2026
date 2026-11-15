from pathlib import Path
import json, re, zipfile, hashlib
from lxml import etree
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_TICK_MARK, XL_LEGEND_POSITION, XL_TICK_LABEL_POSITION
from pptx.chart.data import CategoryChartData
from pptx.oxml.xmlchemy import OxmlElement
from pptx.oxml.ns import qn

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'deliverables/final'
BUILD = ROOT/'deliverables/.final-build'
MEDIA = OUT/'media'
OUT.mkdir(exist_ok=True, parents=True)
BUILD.mkdir(exist_ok=True, parents=True)
BG='0B111E'; CARD='131C31'; BORDER='263450'; WHITE='F8FAFC'; MUTED='94A3B8'; ROSE='FB7185'; ORANGE='F97316'; GREEN='34D399'
FONT='Arial'
prs=Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
prs.core_properties.title='PyroBridge'
prs.core_properties.subject='NASA Space Apps 2026 — Harmonization of MODIS and VIIRS Hot Spots'
prs.core_properties.author='PyroBridge team'
prs.core_properties.keywords='MODIS, VIIRS, FIRMS, seasonal calibration, exploratory holdout'
prs.core_properties.comments='Seven-slide stage presentation with embedded app video demos and speaker notes.'

def color(c): return RGBColor.from_string(c)
def box(slide,x,y,w,h,fill=CARD,line=None,radius=False):
    shape=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,Inches(x),Inches(y),Inches(w),Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb=color(fill)
    if line: shape.line.color.rgb=color(line); shape.line.width=Pt(.7)
    else: shape.line.fill.background()
    if radius:
        try: shape.adjustments[0]=.035
        except: pass
    return shape

def text(slide,content,x,y,w,h,size=22,fg=MUTED,bold=False,align=PP_ALIGN.LEFT,margin=0,spacing=1.12):
    sh=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h))
    tf=sh.text_frame; tf.clear(); tf.word_wrap=True
    tf.margin_left=tf.margin_right=Inches(margin); tf.margin_top=tf.margin_bottom=0
    for i,line in enumerate(content.split('\n')):
        p=tf.paragraphs[0] if i==0 else tf.add_paragraph()
        p.text=line; p.alignment=align; p.space_before=Pt(0); p.space_after=Pt(0); p.line_spacing=spacing
        for r in p.runs:
            r.font.name=FONT; r.font.size=Pt(size); r.font.bold=bold; r.font.color.rgb=color(fg)
    return sh

def new(title,n):
    sl=prs.slides.add_slide(prs.slide_layouts[6]); sl.background.fill.solid(); sl.background.fill.fore_color.rgb=color(BG)
    if title: text(sl,title,.55,.40,12.22,1.12,32,WHITE,True)
    text(sl,f'{n:02}',12.24,7.05,.48,.22,11,MUTED,False,PP_ALIGN.RIGHT)
    return sl

def note(sl,content):
    sl.notes_slide.notes_text_frame.text=content.strip()

def video(sl,clip,poster):
    x,y,w,h=4.57,1.72,8.21,4.618
    box(sl,x-.018,y-.018,w+.036,h+.036,CARD,BORDER)
    movie=sl.shapes.add_movie(str(MEDIA/clip),Inches(x),Inches(y),Inches(w),Inches(h),poster_frame_image=str(MEDIA/poster),mime_type='video/mp4')
    movie.name=f'Embedded demo — {clip}'
    for click in movie._element.xpath('.//a:hlinkClick'):
        if click.get(qn('r:id')) == '':
            del click.attrib[qn('r:id')]
    # Primary recipe: https://github.com/scanny/python-pptx/issues/427
    # python-pptx provides an embedded video and a timing tree. A zero-delay
    # start condition begins playback on slide entry. Repeat on the finite
    # media duration until the parent slide timing ends.
    for media in sl._element.xpath('.//p:video/p:cMediaNode'):
        media.set('vol','0'); media.set('showWhenStopped','1')
        ctn=media.find('{http://schemas.openxmlformats.org/presentationml/2006/main}cTn')
        ctn.set('repeatCount','indefinite'); ctn.set('fill','hold'); ctn.set('restart','always')
        conditions=ctn.find('{http://schemas.openxmlformats.org/presentationml/2006/main}stCondLst')
        if conditions is None:
            conditions=OxmlElement('p:stCondLst'); ctn.insert(0,conditions)
        for old in list(conditions): conditions.remove(old)
        cond=OxmlElement('p:cond'); cond.set('delay','0'); conditions.append(cond)
    return movie

# 1 — mission hook
s=new('',1)
cover=MEDIA/'cover_dashboard.png'
if cover.exists():
    pic=s.shapes.add_picture(str(cover),Inches(7.55),Inches(1.10),width=Inches(5.20),height=Inches(5.00))
    # Preserve source proportions and expose the globe/map area rather than stretching.
    pic.crop_left=.43; pic.crop_right=.19; pic.crop_top=.23; pic.crop_bottom=.12
else:
    # Authentic prior app capture fallback.
    pic=s.shapes.add_picture(str(ROOT/'deliverables/deck/assets/globe.png'),Inches(7.55),Inches(1.10),width=Inches(5.20),height=Inches(5.00))
    pic.crop_left=.43; pic.crop_right=.19; pic.crop_top=.23; pic.crop_bottom=.12
text(s,'PyroBridge',.55,1.48,6.6,1.02,58,WHITE,True)
text(s,'Bridging 26 Years of Incompatible\nNASA Satellite Fire Records',.60,2.75,6.8,1.35,28,WHITE,False)
text(s,'MODIS 1 km',.60,4.62,2.8,.52,25,ROSE,True)
text(s,'VIIRS 375 m',3.66,4.62,3.3,.52,25,ORANGE,True)
text(s,'NASA Space Apps Challenge 2026\nChallenge: Harmonization of MODIS and VIIRS Hot Spots\nOffline-Ready Intelligence Platform',.60,6.28,11.85,.64,13,MUTED,False,spacing=1.2)
note(s,"""
SPEAKER 1 • 00:00–00:20
PyroBridge investigates NASA's long fire-observation record while preserving the differences between MODIS and VIIRS. The title's 26-year framing refers to MODIS-era NASA fire records from 2000 through 2026. Our bundled regional calendar starts in 2003 and contains 20+ years in the long-archive cases. The global view is a pinned, dated NASA FIRMS snapshot, not a continuously refreshed operational feed.
The app supports geographic exploration, six historical investigations, sensor comparison, the seasonal wheel, exploratory calibration and traceable scientific evidence. Monthly normalized global harmonization remains gated.
Sources: README.md; web/public/data/manifest.json; web/public/data/release.json. NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/ . The cover image is an authentic application capture. Its globe uses NASA GIBS / Blue Marble context imagery, not current conditions.
""")

# 2 — sensor gap
s=new('Why raw fire counts lie',2)
text(s,'6.7×',.60,1.61,3.6,1.10,72,ORANGE,True)
text(s,'VIIRS / MODIS ratio',.63,2.79,3.63,.48,21,WHITE,True)
text(s,'625 MODIS · 1 km',.63,3.60,3.62,.47,23,ROSE,True)
text(s,'4,175 VIIRS · 375 m',.63,4.14,3.62,.47,23,ORANGE,True)
text(s,'Evros study rectangle\nAugust 2023 totals',.63,4.90,3.62,.76,19,MUTED)
text(s,'A raw merge creates an\nartificial post-2012 step.',.63,6.00,3.64,.66,20,WHITE)
video(s,'clip2_fire_mesh.mp4','poster2_fire_mesh.png')
text(s,'Nominal resolution mesh · acquisition times differ',4.58,6.56,8.17,.40,15,MUTED)
note(s,"""
SPEAKER 1 • 00:20–00:55
MODIS and VIIRS sample thermal activity at different nominal resolutions. The one-kilometre and 375-metre meshes make the resolution gap visible. They are reference grids, not actual satellite footprint reconstructions. Real pixel footprints vary off nadir, and acquisition times differ.
In the Evros study rectangle for the full month of August 2023, the archive contains 625 Aqua MODIS detections and 4,175 S-NPP VIIRS detections. The ratio is 4,175 / 625 = 6.68, rounded to 6.7×. These are reported hotspot pixels, not unique fires. The case image is dated 22 August 2023. The values on this slide are monthly totals, not that day's totals. The single-day 22 August counts differ.
A simple concatenation of sensors can insert an artificial discontinuity after VIIRS becomes available in 2012. These records require calibration and observing-effort normalization before comparative trend claims. The demo shows the comparison divider moving across authentic app observations and nominal mesh overlays.
Sources: web/public/data/manifest.json, case evros; web/public/data/observations/evros/2023-08.json; web/src/RegionalMap.tsx; web/src/fire-mesh/resolution-mesh.ts. NASA FIRMS MODIS and VIIRS information: https://firms.modaps.eosdis.nasa.gov/ .
""")

# 3 — geography
s=new('Global-to-local fire exploration',3)
text(s,'74,304',.60,1.62,3.70,1.03,58,ORANGE,True)
text(s,'NOAA-20 VIIRS detections',.64,2.77,3.62,.58,20,WHITE,True)
text(s,'Pinned snapshot\n13–14 November 2026',.64,3.45,3.63,.79,19,MUTED)
text(s,'20+ years of regional archives',.64,4.56,3.63,.70,22,WHITE,True)
text(s,'Six landscapes\nEvros, Evia, Rhodes, Manavgat,\nGran Chaco, Northern Pantanal',.64,5.56,3.63,1.12,18,MUTED)
video(s,'clip1_explore.mp4','poster1_explore.png')
text(s,'Offline-first exploration with sensor identity preserved',4.58,6.56,8.17,.40,15,MUTED)
note(s,"""
SPEAKER 1 • 00:55–01:25
The global-to-local atlas lets a judge move from Earth to a geographic region and inspect detection telemetry. The dated global snapshot contains 74,304 NOAA-20 VIIRS detections. Its precise acquisition window is 13 November 2026 00:15 UTC through 14 November 2026 13:33 UTC. The bundle also includes a separate Aqua MODIS global layer. The prominent count here refers specifically to NOAA-20 VIIRS, not the total across sensors.
Six selected historical landscapes link geographic exploration to archived monthly records: Evros, Evia, Rhodes, Manavgat, Gran Chaco and Northern Pantanal. The long regional calendars begin in 2003. Gran Chaco and Northern Pantanal have a narrower bundled 2020 archive. The six landscapes are a feasibility and demonstration selection, not a representative global validation sample.
Production service-worker caching supports offline rehearsal. The offline precache includes the pinned global snapshot, geography, featured months, complete calendar summaries, imagery and science reports. Other monthly point partitions are cached after they have been viewed online. Development builds do not register the production service worker.
Sources: README.md; web/public/data/manifest.json; web/scripts/build-offline.mjs; web/src/orbital/OrbitalAtlas.tsx. NASA Earthdata FIRMS: https://firms.modaps.eosdis.nasa.gov/ .
""")

# 4 — calendar
s=new('Seasonal fire intelligence',4)
text(s,'89%',.60,1.64,3.65,1.12,72,ORANGE,True)
text(s,'of 2023 detections\noccurred in August',.64,2.94,3.64,.94,21,WHITE,True)
text(s,'4,178 of 4,685 S-NPP VIIRS\nEvros + Evia rectangles',.64,4.12,3.63,.76,18,MUTED)
text(s,'12-petal seasonal wheel',.64,5.25,3.63,.49,22,WHITE,True)
text(s,'October leads in 9 of 13\ncomplete archive years',.64,6.02,3.63,.76,19,MUTED)
video(s,'clip3_calibration_wheel.mp4','poster3_calibration_wheel.png')
text(s,'Observed counts and clearly labelled experimental estimates',4.58,6.56,8.17,.40,15,MUTED)
note(s,"""
SPEAKER 1 • 01:25–01:55
The twelve-petal wheel makes within-year concentration visible. Each petal's area represents a monthly count. Year scrubbing preserves a common scale when scale lock is enabled. Users can inspect original Aqua MODIS and S-NPP VIIRS records or switch to explicitly experimental seasonal-scaling estimates.
In the combined Evros and Evia study rectangles, August accounts for 4,178 of 4,685 S-NPP VIIRS detections in 2023: 89.18%, rounded to 89%. This describes the bounded sensor archive, not all of Greece, unique fires, burned area or a risk forecast.
Across the combined rectangles, October is the leading recorded month in 10 of the 14 recorded archive years from 2012 through 2025. Because 2012 is a partial VIIRS year, the slide states the more conservative complete-year comparison: October leads in 9 of 13 complete years, 2013–2025. Seasonal concentration also depends on observing opportunities, clouds and overpass effort.
Experimental monthly estimates calibrate archive counts on the VIIRS scale. They do not infer new fire locations, normalize complete monthly observation effort, or qualify as official monthly harmonized releases.
Sources: web/public/data/manifest.json monthly summaries for evros and evia; docs/submission-copy.md; web/public/data/monthly-harmonization.json; web/src/Calendar.tsx; web/src/calendar/SeasonWheel.tsx.
""")

# 5 — separate pilot and monthly evidence
s=new('Simple Seasonal Scaling Beats Complex ML\nUnder Strict Holdout',5)
# Clean native evidence panels retain editable data, with no screenshot chart.
text(s,'48 cell-passes',.62,1.59,5.55,.42,20,WHITE,True)
text(s,'MAE',.62,2.11,1.0,.3,14,MUTED)
data=CategoryChartData(); data.categories=['Unchanged','Seasonal','Negative binomial','LightGBM']; data.add_series('MAE',[4.125,2.620,5.924,11.221])
chart=s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED,Inches(.48),Inches(2.27),Inches(5.79),Inches(3.70),data).chart
chart.has_legend=False; chart.has_title=False
chart.chart_style=10
plot=chart.plots[0]; plot.gap_width=60; plot.has_data_labels=True
labels=plot.data_labels; labels.position=XL_LABEL_POSITION.OUTSIDE_END; labels.number_format='0.000'; labels.font.name=FONT; labels.font.size=Pt(17); labels.font.color.rgb=color(WHITE)
series=chart.series[0]
for idx,c in enumerate([ROSE,GREEN,MUTED,MUTED]):
    pt=series.points[idx]; pt.format.fill.solid(); pt.format.fill.fore_color.rgb=color(c); pt.format.line.fill.background()
cat=chart.category_axis; cat.reverse_order=True; cat.tick_labels.font.name=FONT; cat.tick_labels.font.size=Pt(16); cat.tick_labels.font.color.rgb=color(WHITE); cat.major_tick_mark=XL_TICK_MARK.NONE; cat.minor_tick_mark=XL_TICK_MARK.NONE
val=chart.value_axis; val.minimum_scale=0; val.maximum_scale=14.5; val.major_unit=4; val.tick_labels.font.name=FONT; val.tick_labels.font.size=Pt(12); val.tick_labels.font.color.rgb=color(MUTED); val.major_tick_mark=XL_TICK_MARK.NONE; val.minor_tick_mark=XL_TICK_MARK.NONE; val.has_major_gridlines=False; val.tick_label_position=XL_TICK_LABEL_POSITION.NONE
chart.chart_style=10
# Explicitly transparent chart/plot backgrounds match the dark canvas.
for tag in ['c:chartSpace','c:plotArea']:
    els=chart._chartSpace.xpath('.//'+tag) if tag!='c:chartSpace' else [chart._chartSpace]
    for el in els:
        old=el.find('{http://schemas.openxmlformats.org/drawingml/2006/chart}spPr')
        if old is not None: el.remove(old)
        sp=OxmlElement('c:spPr'); nf=OxmlElement('a:noFill'); sp.append(nf); ln=OxmlElement('a:ln'); ln.append(OxmlElement('a:noFill')); sp.append(ln)
        before=next((child for child in el if etree.QName(child).localname in ('txPr','externalData','printSettings','userShapes','extLst')),None)
        if before is not None: el.insert(el.index(before),sp)
        else: el.append(sp)
for default_run in chart._chartSpace.xpath('.//a:defRPr'):
    latin=default_run.find(qn('a:latin'))
    if latin is None:
        latin=OxmlElement('a:latin'); default_run.append(latin)
    latin.set('typeface',FONT)
for font_element in chart._chartSpace.xpath('.//a:latin'):
    font_element.set('typeface',FONT)
text(s,'−36%',.65,6.19,5.48,.48,25,GREEN,True)
text(s,'648 region-months · 13 holdouts',6.79,1.59,5.90,.48,20,WHITE,True)
rows=[['','Raw MAE','Scaled MAE'],['Evros','50.78','14.50'],['Rhodes','7.76','2.36'],['Manavgat','30.45','17.42'],['Gran Chaco','16,004','7,140'],['N. Pantanal','10,352','1,069']]
table=s.shapes.add_table(6,3,Inches(6.79),Inches(2.28),Inches(5.89),Inches(3.70)).table
table.columns[0].width=Inches(2.45);table.columns[1].width=Inches(1.72);table.columns[2].width=Inches(1.72)
for i,row in enumerate(rows):
    table.rows[i].height=Inches(.60 if i else .70)
    for j,value in enumerate(row):
        cell=table.cell(i,j); cell.text=value;cell.margin_left=Inches(.12);cell.margin_right=Inches(.12);cell.margin_top=Inches(.10);cell.margin_bottom=0;cell.vertical_anchor=MSO_ANCHOR.MIDDLE
        cell.fill.solid(); cell.fill.fore_color.rgb=color(CARD if i%2 or i==0 else BG)
        for p in cell.text_frame.paragraphs:
            p.alignment=PP_ALIGN.LEFT if j==0 else PP_ALIGN.RIGHT
            for r in p.runs:
                r.font.name=FONT;r.font.size=Pt(17 if i==0 else 20);r.font.bold=i==0 or j==2;r.font.color.rgb=color(MUTED if i==0 else GREEN if j==2 else WHITE)
        tcPr=cell._tc.get_or_add_tcPr()
        for border_tag in ('a:lnL','a:lnR','a:lnT','a:lnB'):
            el=OxmlElement(border_tag);el.set('w','0');el.append(OxmlElement('a:noFill'));tcPr.append(el)
text(s,'5/6 landscapes',6.81,6.18,5.87,.46,25,GREEN,True)
# The sixth landscape, Evia, is documented in speaker notes.
note(s,"""
SPEAKER 2 • 01:55–02:35
The chart and table are different experiments and their MAE units must not be compared directly.
MATCHED-PASS PILOT: 48 coverage-eligible co-located Aqua MODIS / S-NPP VIIRS cell-passes in two independent withheld study regions, Evia and Evros. The unit is hotspot pixels per 0.25-degree cell and paired pass. The selected feasibility sample has 42 zero target rows and only six positive target rows. Mean regional held-out MAEs are unchanged MODIS rate 4.125, seasonal scaling 2.620, negative binomial 5.924 and LightGBM 11.221. Seasonal scaling reduces error by (4.12503048−2.62039013)/4.12503048 = 36.48%, rounded to 36%. The small selected sample does not validate monthly history or global transfer.
MONTHLY ARCHIVE-COUNT EXPERIMENT: 648 overlapping region-months, fixed model parameters, 13 whole-year folds from 2013 through 2025. Each fold withholds that entire year across all landscapes. The protocol excludes the partial 2012 VIIRS year. Seasonal scaling improves raw MODIS MAE in five of six landscapes. Exact raw → scaled MAE: Evros 50.78 → 14.50; Rhodes 7.76 → 2.36; Manavgat 30.45 → 17.42; Gran Chaco 16004.00 → 7139.67; Northern Pantanal 10351.83 → 1069.44. The table rounds the two large-count landscapes to whole detections. Evia is the exception: 49.12 → 53.70.
The monthly unit is reported S-NPP VIIRS detections per region-month. These exploratory year folds are not a locked prospective test. Only 2020 is bundled for Gran Chaco and Northern Pantanal, so the held-out 2020 fold excludes both landscapes from training and offers weaker transfer evidence. Cloud and overpass effort remain unnormalized. LightGBM's worse held-out errors show poor generalization here. Describing that as overfitting is an interpretation, not a separately measured causal diagnosis.
Sources: web/public/data/models.json; web/public/data/monthly-harmonization.json; README.md, calibration tables.
""")

# 6 — gate and engineering
s=new('Scientific integrity & engineering architecture',6)
pillars=[(.62,'Release gate',ORANGE,'monthlyRelease: false','Monthly release awaits\ncloud and scan-angle\nnormalization.'),(4.88,'Reproducible pipeline',ROSE,'Python + DuckDB','pandas / NumPy\nCo-located Aqua MODIS\nand S-NPP VIIRS passes.'),(9.14,'Reliability',GREEN,'46 automated tests','14 pipeline + 32 frontend\nOffline caching in production')]
for x,heading,accent,lead,body in pillars:
    box(s,x,1.83,3.58,4.69,CARD,BORDER)
    text(s,heading,x+.24,2.18,3.10,.76,24,WHITE,True)
    text(s,lead,x+.24,3.34,3.10,1.02,26,accent,True)
    text(s,body,x+.24,4.72,3.08,1.32,20,MUTED)
note(s,"""
SPEAKER 2 • 02:35–03:05
The release gate is a product feature. The bundled official release policy has monthlyRelease:false and publishedEstimates:0. Unnormalized experimental monthly archive-count calibration is visibly labelled and separately inspectable. Those estimates do not constitute official global monthly releases, calibrated anomalies, or forecasts.
The next scientific work includes complete monthly observation opportunities, an explicitly declared reference observing effort, cloud-cover and off-nadir scan-angle normalization, and independent geography and later-time monthly holdouts under a frozen protocol. Selected-pass common-coverage checks alone do not establish historical monthly accuracy.
The reproducible scientific pipeline uses Python, DuckDB and pandas/NumPy to pair co-located Aqua MODIS and S-NPP VIIRS passes and test source-independent inference.
The current checkout's executed automated suite passes 46 tests: 14 pipeline and 32 frontend. The production frontend supports service-worker caching for offline exploration. Its development server does not install that worker.
Sources: web/public/data/release.json; config/release-policy.json; pipeline/; pyproject.toml; tests/; web/src/*.test.ts; web/scripts/build-offline.mjs; README.md.
""")

# 7 — next milestone, credits, disclosure
s=new('Next: normalized monthly releases',7)
text(s,'Cloud-mask & off-nadir normalization',.63,1.71,11.95,.74,34,WHITE,True)
text(s,'For emergency managers',.65,2.63,11.92,.48,24,GREEN)
box(s,.63,3.63,12.05,1.34,CARD,BORDER)
text(s,'NASA Earthdata FIRMS',.88,3.83,11.53,.39,23,WHITE,True)
text(s,'MODIS Collection 6.1 · Suomi-NPP VIIRS 375 m · NOAA-20 VIIRS 375 m',.88,4.38,11.53,.38,19,MUTED)
text(s,'Use of SI (AI) disclosure',.65,5.51,11.92,.46,23,WHITE,True)
text(s,'Statistical/ML benchmarks: seasonal scaling and LightGBM\nAI-assisted software engineering and presentation drafting',.65,6.07,11.92,.76,20,MUTED)
note(s,"""
SPEAKER 2 • 03:05–03:30
The next milestone is cloud-mask and off-nadir scan-angle normalization, followed by independent monthly validation under a frozen release protocol. That evidence is required before global monthly harmonized releases can support emergency managers. This is a roadmap, not a current operational capability.
NASA DATA CREDITS: NASA Earthdata FIRMS. The app uses Aqua MODIS Collection 6.1 active-fire detections, Suomi-NPP VIIRS 375 m active-fire detections and NOAA-20 VIIRS 375 m active-fire detections. Preserve the source sensor and acquisition timestamps. MODIS and VIIRS are distinct instruments, and reported detections are neither unique fires nor burned area. Source metadata and authentic imagery credits remain in the app.
SI (AI) / MODEL DISCLOSURE: The team benchmarked statistical seasonal scaling against negative-binomial regression and LightGBM. These measured model diagnostics derive from the reproducible pipeline and NASA observations, not generated data. OpenAI Codex assisted with research synthesis, software engineering, tests, interface work, and presentation/script drafting. No generated NASA logo, flag or mission identifier appears in the deck.
Sources: web/public/data/manifest.json; web/public/data/models.json; web/public/data/monthly-harmonization.json; web/public/data/release.json; docs/submission-copy.md. NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/ . MODIS active fire: https://modis-fire.umd.edu/ . VIIRS active fire: https://viirsland.gsfc.nasa.gov/Products/NASA/FireESDR.html .
""")

PPTX=OUT/'PyroBridge_Final_Deck.pptx'
prs.save(PPTX)
# Inspect package and record a compact private content/timing receipt.
ns={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(PPTX) as z:
    slidefiles=sorted([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n)],key=lambda n:int(re.search(r'(\d+)\.xml',n).group(1)))
    slides=[]
    for name in slidefiles:
        root=etree.fromstring(z.read(name)); words=root.xpath('//a:t/text()',namespaces=ns)
        visible_chart_text=[]
        owner=prs.slides[len(slides)]
        for shape in owner.shapes:
            if shape.has_chart:
                ch=shape.chart
                visible_chart_text.extend([c.label for c in ch.plots[0].categories])
                visible_chart_text.extend([f'{v:.3f}' for v in ch.series[0].values])
        videos=root.xpath('//p:video/p:cMediaNode',namespaces=ns)
        slides.append({'slide':name,'wordCount':len([w for w in re.findall(r'\S+',' '.join(words+visible_chart_text)) if re.search(r'[A-Za-z0-9]',w)]),'visibleChartText':visible_chart_text,'text':words,'videoTiming':[etree.tostring(x).decode() for x in videos]})
    receipt={'slideCount':len(slidefiles),'dimensionsEmu':[prs.slide_width,prs.slide_height],'embeddedMp4':[n for n in z.namelist() if n.startswith('ppt/media/') and n.endswith('.mp4')],'notesCount':sum(bool(re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)) for n in z.namelist()),'chartCount':sum(bool(re.fullmatch(r'ppt/charts/chart\d+\.xml',n)) for n in z.namelist()),'nativeTableSlides':[i+1 for i,n in enumerate(slidefiles) if b'<a:tbl>' in z.read(n)],'sha256':hashlib.sha256(PPTX.read_bytes()).hexdigest(),'slides':slides}
    assert receipt['slideCount']==7
    assert receipt['notesCount']==7
    assert len(receipt['embeddedMp4'])==3
    assert receipt['chartCount']==1
    assert receipt['nativeTableSlides']==[5]
(BUILD/'content-validation.json').write_text(json.dumps(receipt,indent=2))
print(json.dumps({'pptx':str(PPTX),'slides':7,'embeddedMp4':3,'wordCounts':[s['wordCount'] for s in receipt['slides']]}))

# LibreOffice does not paint movie posters reliably. Export an otherwise
# identical private static copy so the seven-page PDF contains crisp stills.
static=Presentation(PPTX)
poster_by_slide={1:'poster2_fire_mesh.png',2:'poster1_explore.png',3:'poster3_calibration_wheel.png'}
for idx,poster in poster_by_slide.items():
    sl=static.slides[idx]
    for shape in list(sl.shapes):
        if not shape.name.startswith('Embedded demo'):
            continue
        old=shape._element; position=sl.shapes._spTree.index(old)
        pic=sl.shapes.add_picture(str(MEDIA/poster),shape.left,shape.top,width=shape.width,height=shape.height)
        pic.name='PDF poster — '+poster
        sl.shapes._spTree.remove(pic._element)
        sl.shapes._spTree.insert(position,pic._element)
        sl.shapes._spTree.remove(old)
    for timing in list(sl._element.xpath('./p:timing')):
        sl._element.remove(timing)
static_dir=BUILD/'static'; static_dir.mkdir(exist_ok=True)
static_path=static_dir/'PyroBridge_Final_Deck.pptx'
static.save(static_path)
print(json.dumps({'staticPdfSource':str(static_path)}))
