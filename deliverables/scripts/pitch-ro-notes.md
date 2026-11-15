# Note în română — PyroBridge, versiunea unificată

Ordinea urmează cele șapte slide-uri din `../deck/pyrobridge-seven-slides.md`. Durata locală de trei/cinci minute este o țintă de repetiție, nu o regulă verificată a evenimentului. Folosiți aplicația din `nasa-unified`; fișierele PPTX/PDF/video importate arată versiunea veche a ramurii vizuale.

## 1 · Problema

Un specialist care analizează un sezon dificil vrea să compare observațiile cu trecutul. Dar o arhivă mai lungă nu înseamnă automat o comparație corectă. MODIS și VIIRS au rezoluții și oportunități de observație diferite. PyroBridge face diferența vizibilă și testează ce putem armoniza responsabil.

## 2 · Explore

Harta MapLibre rămâne continuă când ne deplasăm și mărim imaginea. Instantaneul global separat include 74.304 detecții NOAA-20 VIIRS din 13–14 noiembrie 2026. Putem afișa și cele 7.031 detecții Aqua MODIS; împreună sunt 81.335. Intervalul exact este 13 noiembrie, 00:15 UTC – 14 noiembrie, 13:33 UTC.

O detecție termică nu este neapărat un incendiu distinct, iar ora achiziției nu este ora izbucnirii.

## 3 · Șase investigații

Păstrăm Evros, Evia, Rhodes, Manavgat, Gran Chaco și Northern Pantanal. Sunt zone dreptunghiulare de studiu, nu totaluri naționale.

Comparația Fire-Mesh folosește marcaje roz pentru MODIS și coral pentru VIIRS. Deplasăm separatorul și activăm sau ascundem grila. Celulele de 1 km și 375 m sunt referințe nominale. Nu sunt amprentele reale ale scanărilor, suprafețe arse sau perimetre de incendiu. Dimensiunile raportate rămân în fișa observației.

## 4 · Calendarul sezonier

Calendarul păstrează tabelul și graficul lunar și adaugă o roată cu douăsprezece petale. Schimbăm anul, selectăm luna și comparăm numărul observat cu estimarea experimentală armonizată. Exportul CSV păstrează eticheta experimentală.

Experimentul lunar folosește 648 de combinații regiune–lună și treisprezece evaluări cu anul întreg exclus din antrenare. Scalarea sezonieră depășește MODIS brut în cinci din șase peisaje; Evia este excepția. Norii și frecvența observațiilor nu sunt normalizate.

## 5 · Testăm calibrarea

În Models & validation alegem peisajul, luna și modelul, deplasăm cursorul de calibrare și dezvăluim ce a raportat VIIRS. Pătratele ilustrează numere, nu poziții de incendii estimate.

Separat, pilotul cu treceri asociate are 48 de exemple eligibile în două regiuni: 42 de ținte zero și șase pozitive. Eroarea absolută medie regională este 2,620 pentru scalarea sezonieră și 4,125 pentru controlul MODIS neschimbat. Unitatea este numărul de pixeli termici pe celulă de 0,25 grade și pereche de treceri. Acest pilot nu validează întreaga istorie lunară.

## 6 · Limita publicării

Estimările experimentale lunare sunt vizibile și exportabile cu eticheta lor. Produsul lunar oficial, normalizat pentru efortul de observație, rămâne blocat: `monthlyRelease: false`, fără estimări oficiale publicate.

Următorul pas este validarea lunară independentă, cu toate oportunitățile de observație, un efort de referință declarat, mai multe regiuni și sezoane și un protocol fixat înainte de evaluare. Data & sources păstrează sursele și limitele la vedere.

## 7 · Încheiere

NASA pune observațiile la dispoziție. PyroBridge le leagă de geografie, sezoane și rezultate măsurate.

Alegeți un loc. Urmăriți un sezon. Testați legătura înainte de a vă baza pe comparație.

## Formulări de păstrat

- „Detecții termice”, nu „număr de incendii”.
- „Celule nominale de referință”, nu „perimetru ars”.
- „Estimări lunare experimentale”, distinct de produsul lunar oficial blocat.
- „48 de celule și treceri asociate”, nu „48 de luni”.
- „Cinci din șase peisaje în evaluarea lunară”, nu „validat global”.
- „UTC” pentru toate orele de achiziție.
