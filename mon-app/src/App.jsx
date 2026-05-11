import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from "./services/api";
import { syncDeclarationsFromBackend, pushDeclarationToBackend, updateDeclarationInBackend, deleteDeclarationFromBackend } from "./services/declarations";
import { syncAffectationsFromBackend, pushAffectationToBackend, deleteAffectationFromBackend } from "./services/affectations";
import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from 'xlsx'; 

// Fix icones Leaflet sous webpack/CRA (les chemins par defaut sont casses par le bundler)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ═══ REAL DATA ═══
const ALL_COS = [
  {n:"Nouhayla Tazi",s:21,t:62,sup:["GKN Sinter","F2J JAPY","APTIV SERVICES DEUTSCHLAND","EUROSTYLE SYSTEMS PORTUGAL","FEDERAL-MOGUL WIESBADEN","APTIVPORT SERVICES","Martur Auto","SACRED","EUROSTYLE SYSTEMS LIPTOVSKY","JOYSON SAFETY SYSTEMS","ITW RIVEX","Joyson Safety","La Fonte Ardennaise","Aptiv Hungary","CYPRIUM FRANCE","NOBEL PLASTIQUES","XIEZHONG MOROCCO","GROUPE MECANIQUE DECOUPAGE","SACRED MAROC","FEDERAL MOGUL GARENNES","L & L PRODUCTS EUROPE"]},
  {n:"Oussama Oulaoui",s:20,t:55,sup:["Dourdin","SIKA AUTOMOTIVE","PURFLUX FILTRATION","KAMAX GMBH","ETS PERNAT EMILE","SNOP AUTOMOTIVE OPOLE","FRAGOLA INDUSTRIES","Cooper","HELLERMANNTYTON","KAMAX S.R.O.","AAPICO MAIA","FAURECIA INTERIEUR","ALGONTEC","Le Belier","TALENDI","FAURECIA SIEGES","EUROSTYLE TACHOV","PURFLUX d.o.o.","SOGEFI AIR","KAMAX S.L.U"]},
  {n:"Anas Elalemidrissi",s:19,t:38,sup:["BHAVANI INDUSTRIES","WALOR EXTRUSION","ELECTRICFIL","BRINK TOWING","EUROCAST THONON","SC2N","COOPER STANDARD FRANCE","PLASTIC OMNIUM","MOTOKOM SLOVAKIA","NSK FRANCE","EUROCAST PORTUGAL","SACIA COMERCIO","ZF SLOVAKIA","ADLER PELZER","BASF FRANCE","SLAMI","ORHAN AUTOMOTIVE","F2J MECATECH","HANON SYSTEMS"]},
  {n:"Soufiane Hamidi",s:19,t:24,sup:["FAVI-LE LAITON","STABILUS","INDUSTRIELLE DESMARQUOY","Bronze Alu","PRODUITS PLASTIQUES 3P","Vitesco Technologies","GRUPO ANTOLIN SIBIU","SA JST FRANCE","FORGES DE FRONCLES","Lydech GmbH","MAHLE FILTERSYSTEME","SAB THEVENIN","SKF FRANCE","SMRC Automotive","REVOCOAT France","Bitron Electronic","Purem St Michel","LS INDUSTRIE","SOCIETE DES FORGES"]},
  {n:"Basma Qnynou",s:17,t:70,sup:["CAILLAU","STEEP PLAST SLOVAKIA","NOVARES MC Diffusion","BOWDEN SAS","DENAT 2007","VALEO VISION","INTEVA FRANCE","Metalplast","TI GROUP AUTOMOTIVE","Harbin Good","HENKEL TECHNOLOGIES","EUROSTYLE VALENCIENNES","EUROSTYLE TANGER","Saint Jean","GEMMY ELECTRONICS","FICOMIRRORS FRANCE","DUNCHA FRANCE"]},
  {n:"Amine Afraoui",s:16,t:38,sup:["GARDETTE INDUSTRIE","CEVA Logistics","PIERBURG PUMP","CIKAUTXO RO","CARBODY","AIRAX","CEVA Slovakia","MAF Villaverde","CEVA Espana","Ceva Maroc","CEVA Czech","DAV","EUROSTYLE CHATEAUROUX","FILTERTEK","EUROSTYLE ESPANA","POLMOTORS"]},
  {n:"Houda Elkhatir",s:16,t:25,sup:["FLT FRANCE","ZANINI FRANCE","CONSTELLIUM SINGEN","FLEXITECH","VALEO ESSUYAGE","ISRI FRANCE","G. CARTIER","AUTONEUM CZ","OPTIMAS OE","Rehau AG","WEVISTA","CIKAUTXO SK","LYDECH THERMIQUE","VERON INTERNATIONAL","LISI","CIKAUTXO COOP"]},
  {n:"Fouad Samih",s:10,t:29,sup:["Ficomirrors Polska","VALEO ELEC.","FAURECIA ROMANIA","INDUSTRIAS TECNICAS","AD PLASTIK","LUCHARD INDUSTRIE","MAHLE FRANCE","Grupo Antolin Besancon","VIBRACOUSTIC CZ","Constellium Extrusions"]},
  {n:"Fatimaezzahra Sakhi",s:7,t:53,sup:["A. AGRATI SPA","A. Raymond Fluid","ROBERT BOSCH FRANCE","ARAYMOND France","AGRATI GIE","FONTANA FASTENERS","ARAYMOND MAROC"]},
  {n:"Manal Redani",s:6,t:10,sup:["ATELIERS MECANIQUES","CIE METAL CZ","EUROCAST BRIVE","GESTAMP HUNGARY","PAULSTRA","Adler Pelzer Nord"]},
  {n:"Hasna Elguettabi",s:21,t:25,sup:["DURA AUTOMOTIVE","JTEKT TORSEN","MANNESMANN PRECISION","SAB MONTMERLE","Modine Uden","SOC ASSEMBLAGE BRASAGE","TRISTONE FLOWTECH FRANCE","ADHEX SLOVAKIA","ADHEX TECHNOLOGIES","AUTONEUM SWITZERLAND","ITW EF&C FRANCE","CEBI Luxembourg","MIBA SINTER SLOVAKIA","Woory Slovakia","SCHERDEL GMBH","ADHEX TAPES","TEKNIA AZUQUECA","NORMA FRANCE","ADLER PELZER WEST","Freudenberg","Martur Slovakia"]},
  {n:"Youssef Chagdani",s:21,t:38,sup:["Johnson Electric","Autoliv Switzerland","SIMOLDES PLASTICOS POLSKA","FAURECIA SLOVAKIA","SL Poland","INPLAS","FAURECIA CLARION","COMET SVK","DEFTA TANGER","MASCHINENFABRIK GUIDO","DEFTA SPAIN","PLASTIC OMNIUM EQUIPAMIENTOS","FAURECIA ESPANA","SIMOLDES PLASTICOS SA","SIMOLDES FRANCE","ROCHLING GIJZEGEM","SIMOLDES CZECH","SIMOLDES MAROC","PLASTAZE","VALEO AUTOKLIMATIZACE","Woosu Ams"]},
  {n:"Abdelilah Fettouhi",s:20,t:29,sup:["CONTITECH ANTRIEBSSYSTEME","KIRCHHOFF HUNGARIA","CTS CZECH REPUBLIC","Wuhan Chukai","EURO-TAIWANAISE","KOSTAL ELECTRICA","NAVARRA ESTAMPACION","CARPENTER FOAMS","KOSTAL MAROC","KYB SUSPENSIONS","FAURECIA MOROCCO","Minglida","ROCHLING ARAIA","SFC SOLUTIONS SPAIN","Rotor Clip","SFC MOROCCO","SIKA Automotive DE","Snt Motiv","Regal Automotive","Carpenter Morocco"]},
  {n:"Aimad Tebbay",s:20,t:37,sup:["DA-TOR S.P.A.","LEONI WIRING","CARBODY CZECH","DOURDIN ROMANIA","HUTCHINSON S.R.L","TE CONNECTIVITY","DELTA NORD AFRIQUE","MAIER SDAD COOP.","AMERICAN BILTRITE","INSONORIZANTES PELZER","FABRYKA PLASTIKOW","NORMA JUGOISTOCNA","COOPER STANDARD Espana","PLASTIC OMNIUM EXTERIOR","MAIER FERROPLAST","HUTCHINSON PORTO","REINZ DICHTUNGS","DENSO THERMAL POLSKA","Technitube","Delphi Powertrain"]},
  {n:"Fatima Oubahou",s:20,t:39,sup:["CONTITECH ANOFLEX","YAZAKI EUROPE PARIS","HIRSCHMANN CAR","TEKLAS AUTOMOTIVE","AKWEL TIMISOARA","Continental Cleaning","PREMIUM SOUND","YAZAKI EUROPE MEA","SUMIRIKO AVS CZECH","Yazaki Kenitra","AKWEL EL JADIDA","NICHIRIN BULGARIA","INYECTAMETAL","TRELLEBORG CARQUEFOU","Trelleborg Boleslav","MUBEA Automotive","AKWEL PAREDES","KDK-Dongkook Spain","MANUEL DA CONCEICAO","Astotec Automotive"]},
  {n:"Doha Daanoun",s:19,t:29,sup:["NORMA CZECH","MIBA SINTER AUSTRIA","CEBI SPAIN","NOBEL AUTOMOTIVE SLOVAKIA","Kokinetics","SIGIT MAROC","Polmar Automotive","DENSO SISTEMAS","Phinia","PLASTIC 7 A","TUYAUTO","HOWA TRAMICO PORTUGAL","IM Gears EUROPE","LISI AUTOMOTIVE KNIPPING","SIGIT DOO","DENSO EUROPE","Norma Poland","MMM Autoparts","IM Gears PVT LTD"]},
  {n:"Oumayma Bougnouch",s:19,t:32,sup:["BLEISTAHL PRODUKTIONS","SCHAEFFLER TECHNOLOGIES","SCHAEFFLER FRANCE","ZF Passive Safety Czech","BORGWARNER POLAND","CLAYENS DOUBS","Bontaz Centre CZ","GATES POLSKA","CELULOSA FABRIL","ITW ESPANA","TRETY SAU","BorgWarner Viana","BorgWarner eMobility","MODULOS RIBERA ALTA","NOVARES CZ Zebrak","AMBEMAR MAROC","BOA Metal Solutions","TRISTONE FLOWTECH SPAIN","Carbody Maroc"]},
  {n:"Youness Elbahar",s:19,t:34,sup:["FLEX-N-GATE FRANCE","FICO CABLES","WITTE Automotive Bulgaria","PLASTIC OMNIUM EXTERIORS","MOLDTECS GMBH","Vertis Maroc","KOSTAL Automobil Elektrik","Tsubaki Automotive","ELRINGKLINGER MEILLOR","METAGRA BERGARA","LEAR PONTEVEDRA","KDK Automotive","NOVARES MOROCCO","WITTE Niederberg","WALOR RO","HEWI","Knauf Industries","ANQING ART TP","Metall Druc"]},
  {n:"Fadoua Bendora",s:18,t:24,sup:["LINGOTES ESPECIALES","LE JOINT FRANCAIS","PROFIL VERBINDUNGSTECHNIK","FTE AUTOMOTIVE CZECHIA","AUMOVIO Benelux","MAIER NAVARRA","INTERCABLE S.R.L.","Nanogate Slovakia","BOLLHOFF OTALU","MINTH AUTOMOTIVE","SCHERDEL Beauvais","LBK LIVNICA KIKINDA","BATZ ZAMUDIO","GRUPO ANTOLIN-ARAGUSA","INTERCABLE S.R.O.","F. SEGURA VIGO","FLEX-N-GATE MARLES","SENSATA TECHNOLOGIES"]},
  {n:"Mohammedtaha Tahtah",s:18,t:36,sup:["FLEX-N-GATE NAVARRA","Benteler Automotive SK","ORAU MOROCCO","GESTAMP SERVICIOS","ORAU ORHAN OTOMOTIV","AFF St Flo","Gestamp Toledo","Eurocade","MOLDTECS SAS","ZF PASSIVE SAFETY POLAND","Magna Mekatronics","IAC","Mann+Hummel","NICHIAS AUTOPARTS","ART METAL MFG","REVOCOAT","Manufactura Moderna","4fastening"]},
  {n:"Nafil Riyad",s:18,t:33,sup:["MAHLE VENTILTRIEB","VERON INTERNATIONAL","NTN EUROPE","NEDSCHROEF FASTENERS SPAIN","ZANINI AUTO GRUP","NEDSCHROEF FASTENERS SAS","NOVARES CZ Janovice","FICOSA AUTOMOTIVE","NOVARES AROUCA","SUMIRIKO AVS ROMANIA","XZB Europe","Faurecia Exhaust","WESTAFLEX TUBOS","TI AUTOMOTIVE MOROCCO","SAI AUTOMOTIVE FRADLEY","SCHUNK SINTERMETALLTECHNIK","FICOSA MAROC","COOPER-STANDARD MOROCCO"]},
  {n:"Anass Elmhari",s:24,t:33,sup:["VOSGES TECHNOLOGIE","FEDERAL MOGUL VALVETRAIN","HILITE GERMANY","PERNAT SMJ","Yanfeng Slovakia","MECANINDUS","NICHIRIN SPAIN","BCS AUTOMOTIVE","PIONEER EUROPE","VOESTALPINE ROTEC","DEFI GROUP","Minebea AccessSolutions Hungary","Hilite Czech","PROMA INDUSTRIE","Saint Gobain","GERGONNE MOROCCO","PROMA HISPANIA","Gestamp-Tuyauto","SANOH UK","Megatech","MEGATECH ORENSE","Minebea Italia","MEGATECHIND MARINHA","SNOP TANGER"]},
  {n:"Yassine Benrahmoune",s:24,t:57,sup:["SOLYEM","BITRON INDUSTRIE ESPANA","Mayser GmbH","ZB NOMEL","IWIS MOBILITY","UFI FILTERS POLAND","EDSCHA VELKY MEDER","VALEO AUTO-ELECTRIC","VALEO LIGHTING INJECTION","HOWMET FIXATIONS","LISI AUTOMOTIVE FORMER","Orhan","ALPEN'TECH","CATELSA CACERES","Veoneer France","Cofat Tunis","REBORN VOSGES","HENKEL Limited","Techni Conc","Rehau Automotive","Valeo Vision Maroc","LEAR VALENCA","WEIDPLAS SPAIN","COFAT MAROC"]},
  {n:"Fatimazahrae Elelabkary",s:23,t:35,sup:["MIASA ZUERA","TRANSFORMACIONES METALURGICAS","FA KROSNO","GRUPO ANTOLIN LUSITANIA","MARQUARDT GMBH","Marquardt France","STE EXPLORACAO PLASTICOS","TENGLONG POLSKA","CIREX B.V.","GRUPO ANTOLIN-DAPSA","CLARTON HORN","Hyundai Corporation Europe","ANTOLIN TANGER","AMCO","AKWEL VIGO","GRUPO ANTOLIN-GLASS","Novares Iberica","HUTCHINSON POLAND","AKWEL SANT JUST","ASPOCK PORTUGAL","Yanfeng Int Spain","Grupo Antolin Germany","INDUSTRIAS AMAYA TELLERIA"]},
  {n:"Imad Hantouti",s:21,t:35,sup:["LITTELFUSE LT UAB","VIBRACOUSTIC POLSKA","Brugola","MAGNA MIRRORS MOROCCO","VIBRACOUSTIC ROMANIA","EUROSTYLE BANOVCE","POLYDESIGN SYSTEMS","SAARGUMMI SLOVAKIA","CARCOUSTICS SLOVAKIA","STEEP PLASTIQUE MAROC","SKF SEALING SOLUTIONS","Vibracoustic","CARPENTER IBERICA","TI GROUP AUTOMOTIVE SA","CONTITECH VIBRATION CONTROL","CONTITECH VIBRATION SAS","ADLER PELZER Eselborn","MAGNA EXTERIORS NYMBURK","Adler","Yanfeng Czechia","VIBRACOUSTIC SE"]},
  {n:"Ayoub Housni",s:9,t:19,sup:["VHIT S.P.A.","Rochling Au","BORGWARNER MORSE ITALY","Dumarey Flowmotion","Webasto Roof","TRECIA","ZF AUTOMOTIVE UK","FEDERAL MOGUL COVENTRY","MA POLSKA"]},
  {n:"Asmae Elawami",s:9,t:11,sup:["FREUDENBERG SEALING","BITRON SPA","MAGNA CLOSURES SPA","WEIDPLAS GMBH","BITRON Hungary","BITRON ELECTRONICS","VGV SRL","SOGO","DAYCO EUROPE"]},
  {n:"Chaimae Ellahrichi",s:9,t:14,sup:["GENTEX CORPORATION","WONDER SPA","Tristone FLOWTECH ITALY","Vodafone","Elringklinger Italia","INDUSTRIE SALERI ITALO","ASK INDUSTRIES","STAMET STAMPAGGI","Ritrama"]},
  {n:"Maroua Elyoussoufi",s:8,t:13,sup:["FOMA S.P.A.","AISIN EUROPE","GKN SINTER METALS SPA","FONTANA LUIGI","SALVADORI SPINOTTI","ERNESTO MALVESTITI","FEDERAL MOGUL OPERATIONS","GKN Powder Metallurgy"]},
  {n:"Matteo Dellamalva",s:7,t:13,sup:["Minebea AccessSolutions Italia","CONFEZIONI ANDREA","Endurance Engineering","RAICAM DRIVELINE","MTA SPA","REVIFA SPA","VIMERCATI SPA"]},
  {n:"Donato Dibenedetto",s:4,t:7,sup:["MARELLI EUROPE SPA","NOVARES ITALIA","SOAG APPLIANCE","STAT SPA"]},
  {n:"Nicola Nistico",s:4,t:7,sup:["ELETTRA 1938","DN Automotive Italy","LASIM SPA","MUVIQ SRL"]},
  {n:"Chahrazad Elhamdaoui",s:3,t:5,sup:["Cebi","ITW LYS FUSION","MODINE PONTEVICO"]},
  {n:"Roberto Cullura",s:3,t:5,sup:["CONFEZIONI ANDREA","FARA INDUSTRIALE","SPM S.p.A."]},
  {n:"Marco Feyles",s:2,t:3,sup:["T.ERRE SRL","O.S.A. S.p.A."]},
  {n:"Mattia Senes",s:1,t:1,sup:["Federal Mogul Powertrain Italy"]},
  {n:"Salim Elimani",s:17,t:41,sup:["SOGEFI AIR & COOLING","MAHLE ENGINE COMPONENTS","TREVES PRODUCTS","COSMOS BIZKAIA","MERCIER-CLAUSSE","DEFTA SLOVAKIA","MAIER CZ","LEAR Corporation Holding","AKWEL SA","HELLA INNENLEUCHTENSYSTEME","HUTCHINSON TUNISIE","HELLA FAHRZEUGKOMPONENTEN","Mubea","APTIV SERVICES POLAND","DELFINGEN MA TANGER 1","DELFINGEN MA TANGER 2","HELLA INNENLEUCHTENSYSTEME GmbH"]},
  {n:"Maurizio Vecchione",s:15,t:39,sup:["Elringklinger","HUF PORTUGUESA","DOURECA","SOFITEC","TRISTONE FLOWTECH SLOVAKIA","TREVES SLOVAKIA","Kongsberg","HUTCHINSON POLAND","DN AUTOMOTIVE Poland","SFA POLSKA","Minebea Slovakia","TREVES ACOUSTIC PORTUGAL","FTE Automotive Move","FTE AUTOMOTIVE SYSTEMS","HUTCHINSON SNC"]},
  {n:"Saad Sghouri",s:15,t:30,sup:["Kiekert","aircom automotive","AKA AUTOMOTIV","ALGONTEC Polska","ITW BAILLY COMTE","NITERRA FRANCE","AUTONEUM FRANCE","MANN+HUMMEL IBERICA","KIRCHHOFF POLSKA","Autoneum Magyarorszag","FORVIA","L & L Product Europe","DENAT 2007","GESTAMP AVEIRO","Merit Autom"]},
  {n:"Sanaa Aamir",s:13,t:20,sup:["HOWA TRAMICO SLOVAKIA","HOWA TRAMICO","HUF ROMANIA","EDSCHA BURGOS","EGANA 2","EDSCHA SANTANDER","ZANINI EPILA","SAARGUMMI CZECH","IZOBLOK GmbH","HOSIDEN Europe","Sgx Europe","HUTCHINSON S.R.O.","BATZ"]},
  {n:"Fatimazahra Assakour",s:11,t:17,sup:["BASF POLYURETHANES","CooperStandard","MAHLE POLSKA","SIGNATA","MATADOR AUTOMOTIVE","MARELLI ESPANA","BASF Maroc","ADP MLADENOVAC","ITW PRONOVIA","VIGNAL SYSTEMS","HELLA GmbH"]},
  {n:"Maryam Afif",s:10,t:79,sup:["ITW DE FRANCE","TUCKER GMBH","PLASTIQUES DU VAL DE LOIRE","SAARGUMMI IBERICA","SNOP","SUMITOMO ELECTRIC WIRING","CONTITECH AVS FRANCE","SNOP ESTAMPACION","ContiTech Vibration Slovakia","FAURECIA SYSTEMES ECHAPPEMENT"]},
  {n:"Soukaina Bouyoussef",s:10,t:14,sup:["HUTCHINSON INDUSTRIAS","Proma Poland","Litens Automotive","PRIMA SOSNOWIEC","Continental","SIDEO RDT","AUTONEUM PORTUGAL","ALCALA INDUSTRIAL","VALEO COMFORT","OR-SAT"]},
  {n:"Fatima Barik",s:9,t:13,sup:["VALEO TERMICO","MAGNA ELECTRONICS EUROPE","Rochling","BECCHIS OSIRIDE","KOVOLIS HEDVIKOV","Rochling Automotive","EUROCAST REYRIEUX","MARELLI FRANCE","VALEO SCHALTER"]},
  {n:"Fatimezzahra Elkaroubi",s:9,t:55,sup:["COOPER STANDARD FRANCE","SNOP CZ","ROBERT BOSCH GMBH","CALIFIL CUSSET","VOESTALPINE AUTOMOTIVE","STEEP","KIRCHHOFF Romania","EUROSTYLE SENS","SAINT JEAN VALLADOLID"]},
  {n:"Mariam Belkarchi",s:9,t:12,sup:["CONTITECH FLUID ROMANIA","SAINT JEAN INDUSTRIES","TRISTONE Poland","EDSCHA HENGERSBERG","ITW Global Tire Repair","ACTIVE TOOLS EUROPE","DMR RUBANS","MARELLI KECHNEC","Marelli PWT Kechnec"]},
  {n:"Khadija Chafai",s:8,t:18,sup:["Aumovio Czech","AUMOVIO Hungary","DEFTA ESSOMES","EUROSTYLE MOLINGES","BORRACHAS PORTALEGRE","SMRC Automotive Slovakia","KDK-Dongkook Spain","SILA POLAND"]},
  {n:"Cristina Origliasso",s:7,t:13,sup:["ALUDEC S.A.","BOS AUTOMOTIVE ROMANIA","Tiberina Automotive","HUF POLSKA","DIEHL METALL","MAGNA AUTOMOTIVE POLAND","VALEO AUTOSYSTEMY"]},
  {n:"Fatimazahrae Berrada",s:7,t:12,sup:["Schaeffler Motion Technologies","Valeo Electrification","BOGE ELASTMETALL","GMD CAST Hungary","ZF FRIEDRICHSHAFEN","LYS FUSION POLAND","COOPER STANDARD AUTOMOTIVE"]},
  {n:"Noura Wakine",s:7,t:17,sup:["MEVIS SLOVAKIA","Contitech Romania","Purem Oradea","Buehler Motor","SAVREUX CLAUSSE","ZF LEMFORDER METAL","CONTITECH THERMOPOL"]},
  {n:"Chaimaa Boutakka",s:6,t:15,sup:["KIRCHHOFF Portugal","BROSE Prievidza","NOBEL AUTOMOTIVE ROMANIA","DAEDONG SYSTEM POLAND","TUBSA AUTOMOCION","SFC SOLUTIONS CZESTOCHOWA"]},
  {n:"Safae Tamasna",s:0,t:0,sup:[]}
];

const MANAGERS_DATA = {
  "Zineb Deguague": { cos: ALL_COS },
  "Mohammed Ouasmine": { cos: ALL_COS }
};

const CATEGORIES = [
  {cat:"Booking Validation",icon:"BV",tasks:[{name:"Inventory Check",dur:22},{name:"Pooling dock check",dur:37},{name:"Availability analysis",dur:64},{name:"Massive acceptance",dur:146},{name:"Validation Data summary",dur:24}]},
  {cat:"Follow Up",icon:"FU",tasks:[{name:"Not processed orders Follow up",dur:21},{name:"Processed in delay Follow up",dur:20}]},
  {cat:"Special Orders",icon:"SO",tasks:[{name:"Special Order Creation",dur:16},{name:"Exchange File",dur:21},{name:"GLE check",dur:28}]},
{cat:"Special Requests",icon:"SR",tasks:[{name:"NOQ Analysis / Escalation",dur:40},{name:"Booking line analysis",dur:24},{name:"Urgent truck",dur:45},{name:"BTAB Request check",dur:5},{name:"Variante fornitore (Supplier Stock / Movement transfer)",dur:15},{name:"Abacofor link check",dur:5},{name:"Client Code Link Check / Cancellation",dur:10}]},  {cat:"Cardboard Analysis",icon:"CA",tasks:[{name:"WR check",dur:33},{name:"Case analysis",dur:69},{name:"Action plan",dur:21}]},
  {cat:"Inventory",icon:"IN",tasks:[{name:"Movement Analysis",dur:26},{name:"Movement Correction",dur:59},{name:"SAP inventory upload",dur:24},{name:"Inventory file archiving",dur:9}]},
  {cat:"Invoicing",icon:"IV",tasks:[{name:"Sending draft report",dur:17},{name:"Correction missing/wrong mvt",dur:70},{name:"Final draft report check",dur:23},{name:"Credit note creation",dur:8},{name:"Final check invoices file",dur:23},{name:"Follow up of payment",dur:60}]},
  {cat:"Recovery",icon:"RC",tasks:[{name:"Recovery",dur:19}]},
  {cat:"Emails",icon:"EM",tasks:[{name:"Emails level 1",dur:3},{name:"Emails level 2",dur:3}]},
  {cat:"Meetings",icon:"MT",tasks:[{name:"Meeting (COS Daily, DO Daily, Face to Face with DO, SPM Booking validation meeting, Cardboard analysis, Overdue, ...)",dur:30},{name:"Supplier meeting",dur:30}]},
  {cat:"Difficulties",icon:"DF",tasks:[{name:"Delays on systems and files",dur:15}]},
  {cat:"Training / Team",icon:"TT",tasks:[{name:"Training for new comer for specific tasks",dur:30},{name:"Support team on daily basis",dur:30}]}
];
const MONTHS = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre'];
const fmtMin = m => {if(!m||m===0)return'0h00';return Math.floor(m/60)+'h'+String(m%60).padStart(2,'0');};
const getInitials = name => name.split(' ').map(w=>w[0]).join('').substring(0,2);
const todayStr = () => {const d=new Date();return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;};

// ═══ STLA SUPPLIERS (à remplacer par le vrai fichier STLA quand disponible) ═══
// Pour l'instant : agrégation de tous les suppliers de tous les COS
const STLA_SUPPLIERS = (() => {
  const set = new Set();
  // sera rempli après ALL_COS — voir dérivation ci-dessous
  return set;
})();
const getStlaList = () => {
  const set = new Set();
  ALL_COS.forEach(c => (c.sup || []).forEach(s => set.add(s)));
  return Array.from(set).sort();
};

// ═══ CALCUL DE LA CHARGE RÉELLE D'UN COS depuis localStorage ═══
const getRealChargeForCos = (cosName) => {
  try {
    const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
    return decl
      .filter(d => d.Consultant === cosName)
      .reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || d['Duree Standard (min)'] || 0), 0);
  } catch { return 0; }
};

// ═══ FORMAT LIVRABLE: Tache/Seller/XF/Pack/LOADid/TO/DN — omet les vides ═══
const buildLivrable = (taskName, fields = {}) => {
  const parts = [
    taskName,
    fields.seller,
    fields.xf,
    fields.pack,
    fields.load,
    fields.to,
    fields.dn,
  ].filter(v => v && String(v).trim() !== '');
  return parts.join('/');
};
// --- MANAGERS SUPPLEMENTAIRES ---
const EXTRA_MANAGERS = [];
// ═══ PEOPLE MANAGERS (extrait de Cos_manager.xlsx) ═══
const PEOPLE_MANAGERS_DATA = {
  'fatimaezzahra.sakhi@capgemini.com': { name: 'Fatima Ezzahra Sakhi', manager: 'Mohammed Ouasmine' },
  'khawla.nidam@capgemini.com': { name: 'Khawla Nidam', manager: 'Mohammed Ouasmine' },
  'lamia.khalouf@capgemini.com': { name: 'Lamia Khalouf', manager: 'Zineb Deguague' },
  'basma.laoudy@capgemini.com': { name: 'Basma Laoudy', manager: 'Mohammed Ouasmine' },
  'zineb.malha@capgemini.com': { name: 'Zineb Malha', manager: 'Zineb Deguague' },
  'hiba.hmito@capgemini.com': { name: 'Hiba Hmito', manager: 'Zineb Deguague' },
};
const TEAM_STRUCTURE = {
  "Zineb Deguague": {
    "Hiba Hmito": ["Saad Sghouri","Fatimazahrae Berrada"],
    "Zineb Malha": ["Salim Elimani","Soukaina Bouyoussef","Fatimazahrae Elelabkary","Mariam Belkarchi","Fatima Barik","Noura Wakine","Fatimazahra Assakour","Chaimaa Boutakka"],
    "Lamia Khalouf": ["Chahrazad Elhamdaoui","Chaimae Ellahrichi","Asmae Elawami","Yassine Benrahmoune","Maroua Elyoussoufi","Imad Hantouti","Fatimazahrae Elelabkary","Anass Elmhari","Ayoub Housni"],
  },
  "Mohammed Ouasmine": {
    "Fatimaezzahra Sakhi": ["Anas Elalemidrissi","Soufiane Hamidi","Amine Afraoui","Manal Redani","Fouad Samih","Oussama Oulaoui","Basma Qnynou","Nouhayla Tazi","Houda Elkhatir","Fatimaezzahra Sakhi"],
    "Khawla Nidam": ["Abdelilah Fettouhi","Oumayma Bougnouch","Doha Daanoun","Youness Elbahar","Fadoua Bendora","Fatima Oubahou","Hasna Elguettabi","Aimad Tebbay","Mohammedtaha Tahtah","Nafil Riyad","Youssef Chagdani"],
    "Basma Laoudy": ["Maryam Afif","Khadija Chafai","Safae Tamasna","Sanaa Aamir"],
  }
};

// Italiens et autres COS non rattachés à un PM Maroc
const getItalianCos = () => {
  const allAssigned = new Set();
  Object.values(TEAM_STRUCTURE).forEach(mgr => {
    Object.values(mgr).forEach(cosList => cosList.forEach(n => allAssigned.add(n)));
  });
  return ALL_COS.filter(c => !allAssigned.has(c.n));
};

// Helper : trouver le COS data par nom
const findCosData = (name) => ALL_COS.find(c => c.n === name);

// Helper : obtenir l'équipe complète d'un manager
const getManagerTeam = (managerName) => {
  const structure = TEAM_STRUCTURE[managerName];
  if (!structure) return { pms: {}, unassigned: [] };
  const pms = {};
  Object.entries(structure).forEach(([pmName, cosNames]) => {
    pms[pmName] = cosNames.map(n => findCosData(n)).filter(Boolean);
  });
  const unassigned = getItalianCos();
  return { pms, unassigned };
};
// --- GENERATION AUTOMATIQUE DES UTILISATEURS ---
const generateUsers = () => {
  const users = [];

  // 1) COS
Object.entries(MANAGERS_DATA).forEach(([managerName, data]) => {
  data.cos.forEach(cos => {
    const parts = cos.n.split(' ');
    const prenom = parts[0].toLowerCase();
    const nom = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : prenom;
    const email = `${prenom}.${nom}@capgemini.com`;
    const password = `${prenom.charAt(0)}${nom}2026`;

    // 🛡️ Anti-doublon : si déjà ajouté, on saute
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return;

    users.push({
      name: cos.n, email, password, role: 'consultant',
      manager: managerName, suppliers: cos.sup, suppliersCount: cos.s, trips: cos.t,
    });
  });
});

  // 2) Managers
Object.keys(MANAGERS_DATA).forEach(managerName => {
  const parts = managerName.split(' ');
  const prenom = parts[0].toLowerCase();
  const nom = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : prenom;
  const email = `${prenom}.${nom}@capgemini.com`;
  const password = `${prenom.charAt(0)}${nom}2026`;

  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return;

  users.push({
    name: managerName, email, password, role: 'manager',
    manager: null, suppliers: [], suppliersCount: 0, trips: 0,
  });
});

  EXTRA_MANAGERS.forEach(mgr => {
    users.push({
      name: mgr.name, email: mgr.email, password: mgr.password, role: 'manager',
      manager: null, suppliers: [], suppliersCount: 0, trips: 0,
    });
  });

  // 3) People Managers — ajoutés OU mis à jour si déjà COS
  Object.entries(PEOPLE_MANAGERS_DATA).forEach(([email, pm]) => {
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      // Ce People Manager est déjà un COS → on change son rôle
      existing.role = 'people_manager';
    } else {
      // Nouveau utilisateur People Manager
      const parts = pm.name.split(' ');
      const prenom = parts[0].toLowerCase();
      const nom = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : prenom;
      const password = `${prenom.charAt(0)}${nom}2026`;
      users.push({
        name: pm.name, email, password, role: 'people_manager',
        manager: pm.manager, suppliers: [], suppliersCount: 0, trips: 0,
      });
    }
  });

  return users;
};
const ALL_USERS = generateUsers();
const findUserByEmail = (email) => ALL_USERS.find(u => u.email.toLowerCase() === email.toLowerCase().trim());

// ═══ STYLES ═══
const S = {
  // ═══ PALETTE CAPGEMINI LIGHT THEME ═══
  app:{display:'flex',height:'100vh',fontFamily:"'Sora',sans-serif",background:'#f4f6f9',color:'#000000',overflow:'hidden'},

  sidebar:{width:260,background:'#ffffff',borderRight:'1px solid #e2e8f0',display:'flex',flexDirection:'column',flexShrink:0,overflowY:'auto'},

  logo:{padding:'22px 20px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:10},
  logoBrand:{fontSize:11,fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:'#0070AD'},
  logoTitle:{fontSize:15,fontWeight:700,marginTop:4,color:'#000000'},
  logoSub:{fontSize:11,color:'#2d3748',marginTop:2},

  section:{padding:'10px 0',borderBottom:'1px solid #e2e8f0'},
  sectionLabel:{fontSize:10,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',color:'#2d3748',padding:'6px 20px 4px'},

  navItem:(active)=>({display:'flex',alignItems:'center',gap:10,padding:'9px 20px',cursor:'pointer',fontSize:13,fontWeight:active?600:500,color:active?'#0070AD':'#1a1a1a',background:active?'rgba(0,112,173,0.08)':'transparent',borderLeft:active?'3px solid #0070AD':'3px solid transparent',transition:'all .18s'}),

  userBar:{marginTop:'auto',padding:'14px 18px',borderTop:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:10},
  avatar:{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#0070AD,#12ABDB)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0,color:'#fff'},

  main:{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',background:'#f4f6f9'},

  topbar:{padding:'16px 28px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:12,background:'rgba(255,255,255,0.85)',backdropFilter:'blur(8px)',position:'sticky',top:0,zIndex:10},
  topTitle:{fontSize:17,fontWeight:700,color:'#000000'},
  topDesc:{fontSize:12,color:'#2d3748',marginLeft:'auto'},

  content:{padding:28,flex:1},

  card:{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:12,padding:20,transition:'.18s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'},
  cardTitle:{fontSize:12,fontWeight:600,letterSpacing:'.8px',textTransform:'uppercase',color:'#2d3748',marginBottom:8},
  cardValue:{fontSize:28,fontWeight:700,color:'#000000'},
  cardSub:{fontSize:12,color:'#2d3748',marginTop:4},

  ssTitle:{fontSize:14,fontWeight:700,marginBottom:14,display:'flex',alignItems:'center',gap:8,color:'#000000'},Title:{fontSize:14,fontWeight:700,marginBottom:14,display:'flex',alignItems:'center',gap:8,color:'#000000'},
  sTitleLine:{flex:1,height:1,background:'#e2e8f0'},

  chip:(color)=>({display:'inline-flex',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,
    background:color==='green'?'rgba(22,163,74,0.1)':color==='red'?'rgba(220,38,38,0.1)':color==='orange'?'rgba(217,119,6,0.1)':'rgba(0,112,173,0.1)',
    color:color==='green'?'#16A34A':color==='red'?'#DC2626':color==='orange'?'#D97706':'#0070AD'}),

  btn:(type)=>({padding:'7px 16px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',border:'none',fontFamily:'inherit',
    background:type==='accent'?'#0070AD':type==='ghost'?'#f1f5f9':'rgba(0,112,173,0.08)',
    color:type==='accent'?'#ffffff':type==='ghost'?'#1a1a1a':'#0070AD',
    borderWidth:1,borderStyle:'solid',
    borderColor:type==='ghost'?'#e2e8f0':type==='back'?'rgba(0,112,173,0.3)':'transparent'}),

  memberCard:(color)=>({background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,cursor:'pointer',transition:'.18s',position:'relative',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
    borderTop:`3px solid ${color==='red'?'#DC2626':color==='green'?'#16A34A':'#0070AD'}`}),

  // Carte COS neutre, sans border colorée — affichage net
  memberCardClean:{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,cursor:'pointer',transition:'.18s',position:'relative',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'},

  tab:(active)=>({padding:'8px 16px',borderRadius:8,fontSize:12,fontWeight:600,cursor:'pointer',
    border:'1px solid '+(active?'#0070AD':'#e2e8f0'),
    color:active?'#0070AD':'#2d3748',
    background:active?'rgba(0,112,173,0.08)':'#ffffff'}),

  filterChip:(active)=>({padding:'5px 12px',borderRadius:20,fontSize:11,fontWeight:600,cursor:'pointer',
    border:'1px solid '+(active?'#0070AD':'#e2e8f0'),
    color:active?'#0070AD':'#2d3748',
    background:active?'rgba(0,112,173,0.08)':'#ffffff'}),

  input:{background:'#f9fafb',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',color:'#000000',fontFamily:"'Sora',sans-serif",fontSize:13,outline:'none',width:'100%',boxSizing:'border-box'},

  select:{background:'#f9fafb',border:'1px solid #e2e8f0',borderRadius:8,padding:'10px 14px',color:'#000000',fontFamily:"'Sora',sans-serif",fontSize:13,cursor:'pointer',width:'100%'},

  table:{width:'100%',borderCollapse:'collapse',fontSize:12},
  th:{textAlign:'left',padding:'10px 12px',background:'rgba(0,112,173,0.06)',color:'#0070AD',fontWeight:600,borderBottom:'1px solid #e2e8f0'},
  td:{padding:'8px 12px',borderBottom:'1px solid #e2e8f0',color:'#000000'},

  chartWrap:{background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:12,padding:20,marginBottom:18,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'},

  aiCard:{background:'linear-gradient(135deg,rgba(0,112,173,0.06),rgba(18,171,219,0.03))',border:'1px solid rgba(0,112,173,0.2)',borderRadius:12,padding:22,marginBottom:16},
  aiBadge:{display:'inline-flex',background:'#0070AD',color:'#ffffff',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,marginBottom:12},

  grid:(cols)=>({display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:cols>3?16:18}),

  progressTrack:{background:'#e2e8f0',borderRadius:99,height:8},
  progressFill:(pct,over)=>({height:8,borderRadius:99,width:`${Math.min(100,pct)}%`,background:over?'linear-gradient(90deg,#D97706,#DC2626)':'linear-gradient(90deg,#0070AD,#12ABDB)',transition:'width .4s'}),

  mono:{fontFamily:"'JetBrains Mono',monospace"},

  toast:(show)=>({position:'fixed',bottom:24,right:24,background:'#16A34A',color:'#fff',padding:'12px 22px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,transform:show?'translateY(0)':'translateY(80px)',opacity:show?1:0,transition:'.3s',pointerEvents:'none'}),
};

// ═══ LOGIN SCREEN ═══
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState(() => localStorage.getItem('workload_user_email') || '');
  const [emailLocked, setEmailLocked] = useState(() => {
    const saved = localStorage.getItem('workload_user_email');
    return saved ? /^[a-z]+[-a-z]*\.[a-z]+[-a-z]*@capgemini\.com$/i.test(saved) : false;
  });
  const [password, setPassword] = useState('');
  const [detectedUser, setDetectedUser] = useState(() => {
    const saved = localStorage.getItem('workload_user_email');
    return saved ? findUserByEmail(saved) : null;
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  // ═══ COULEURS CAPGEMINI ═══
  const COLORS = {
    bg: '#f4f6f9',
    card: '#ffffff',
    border: '#e2e8f0',
    textDark: '#000000',
    textMid: '#1a1a1a',
    textLight: '#2d3748',
    // Rôles inspirés de la palette Capgemini
    cos: { main: '#0070AD', light: 'rgba(0,112,173,0.08)', border: 'rgba(0,112,173,0.25)', gradient: 'linear-gradient(135deg,#0070AD,#12ABDB)' },
    pm: { main: '#6B21A8', light: 'rgba(107,33,168,0.08)', border: 'rgba(107,33,168,0.25)', gradient: 'linear-gradient(135deg,#6B21A8,#9333EA)' },
    mgr: { main: '#0D5B2E', light: 'rgba(13,91,46,0.08)', border: 'rgba(13,91,46,0.25)', gradient: 'linear-gradient(135deg,#0D5B2E,#16A34A)' },
    accent: '#0070AD',
    danger: '#DC2626',
    success: '#16A34A',
  };

  const LS = {
    page: {position:'fixed',inset:0,background:COLORS.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100,fontFamily:"'Sora',sans-serif"},
    logo: {position:'absolute',top:28,left:32,display:'flex',alignItems:'center',gap:10},
    logoText: {fontSize:16,fontWeight:700,color:COLORS.accent,letterSpacing:1},
    card: {width:440,background:COLORS.card,border:`1px solid ${COLORS.border}`,borderRadius:16,padding:'36px 40px',textAlign:'center',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'},
    title: {fontSize:22,fontWeight:700,color:COLORS.textDark,marginBottom:4},
    subtitle: {fontSize:13,color:COLORS.textLight,marginBottom:28},
    label: {fontSize:11,fontWeight:600,color:COLORS.textMid,marginBottom:6,textAlign:'left'},
    input: {width:'100%',padding:'12px 14px',fontSize:13,border:`1px solid ${COLORS.border}`,borderRadius:10,background:'#f9fafb',color:COLORS.textDark,outline:'none',fontFamily:'inherit',boxSizing:'border-box',transition:'border .2s'},
    btn: (active,color) => ({width:'100%',padding:13,background:active?color:'#CBD5E0',color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginTop:6,transition:'all .2s'}),
  };

  const getRoleColor = (role) => {
    if (role === 'manager') return COLORS.mgr;
    if (role === 'people_manager') return COLORS.pm;
    return COLORS.cos;
  };

  const getRoleLabel = (role) => {
    if (role === 'manager') return 'Manager';
    if (role === 'people_manager') return 'People Manager';
    return 'Consultant';
  };

  // ═══ HANDLERS (identiques) ═══
  const handleEmailChange = (value) => {
    if (emailLocked) return;
    setEmail(value); setError(''); setDetectedUser(null);
    if (value.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    const matches = ALL_USERS.filter(u =>
      u.email.toLowerCase().includes(value.toLowerCase()) ||
      u.name.toLowerCase().includes(value.toLowerCase())
    ).slice(0, 5);
    setSuggestions(matches); setShowSuggestions(matches.length > 0);
    const exactMatch = findUserByEmail(value);
    if (exactMatch) { setDetectedUser(exactMatch); setShowSuggestions(false); }
  };

  const selectSuggestion = (user) => { setEmail(user.email); setDetectedUser(user); setShowSuggestions(false); setError(''); };


  const handleSubmit = async() => {
    setError('');
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    // ─── Authentification via backend FastAPI ───
    if (!email.trim()) { setError('Veuillez saisir votre email.'); return; }
    if (!password.trim()) { setError('Veuillez saisir votre mot de passe.'); return; }

    try {
      await api.login(email.trim().toLowerCase(), password);
      const backendUser = await api.getMe();

      // On reconstruit un objet user compatible avec le reste de ton code
      const user = {
        id: backendUser.id,
        name: backendUser.name,
        email: backendUser.email,
        role: backendUser.role,
        // Champs conservés pour compatibilité avec ton code existant
        password: '(hashed)',
      };

      localStorage.setItem('workload_user_email', email);
      setEmailLocked(true);

      if (user.role === 'people_manager') {
        setAuthenticatedUser(user);
        setShowRoleChoice(true);
      } else {
        onLogin(user);
      }
    } catch (err) {
      if (err.status === 401) {
        setError('Email ou mot de passe incorrect.');
      } else if (err.message && err.message.includes('Impossible de contacter')) {
        setError('Le serveur est inaccessible. Verifiez que le backend est lance.');
      } else {
        setError('Erreur : ' + (err.message || 'connexion impossible'));
      }
    }
  };

  const handleChangePassword = () => {
    setError('');
    if (!newPassword.trim()) { setError('Veuillez saisir un nouveau mot de passe.'); return; }
    if (newPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caracteres.'); return; }
    if (newPassword !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return; }
    const savedPasswords = JSON.parse(localStorage.getItem('workload_passwords') || '{}');
    savedPasswords[email] = newPassword;
    localStorage.setItem('workload_passwords', JSON.stringify(savedPasswords));
    setShowChangePassword(false); setNewPassword(''); setConfirmPassword(''); setPassword('');
    if (pendingUser.role === 'people_manager') { setAuthenticatedUser(pendingUser); setShowRoleChoice(true); }
    else { onLogin(pendingUser); }
  };

  const handleRoleChoice = (chosenRole) => {
    onLogin({ ...authenticatedUser, originalRole: 'people_manager', role: chosenRole });
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter') { if (showChangePassword) handleChangePassword(); else handleSubmit(); }};

  // ═══ LOGO CAPGEMINI (en-tête commun) ═══
  const CapLogo = () => (
    <div style={{position:'fixed',top:28,left:32,display:'flex',alignItems:'center',gap:10,zIndex:200}}>
      <img src="/logo-capgemini.png" alt="Capgemini" style={{height:32}} onError={(e)=>{e.target.style.display='none'}} />
      <span style={LS.logoText}>Capgemini Engineering</span>
    </div>
  );

  // ═══ BADGE ROLE ═══
  const RoleBadge = ({role}) => {
    const c = getRoleColor(role);
    return <span style={{fontSize:10,fontWeight:700,padding:'4px 12px',borderRadius:20,background:c.light,color:c.main,textTransform:'uppercase',border:`1px solid ${c.border}`}}>{getRoleLabel(role)}</span>;
  };

  // ═══ PAGE CHANGEMENT MOT DE PASSE ═══
  if (showChangePassword) {
    return (
      <div style={LS.page}>
        <CapLogo/>
        <div style={LS.card}>
          <div style={{fontSize:28,marginBottom:6}}>🔐</div>
          <div style={{...LS.title,fontSize:20}}>Premiere connexion</div>
          <div style={LS.subtitle}>Veuillez changer votre mot de passe pour securiser votre compte</div>

          <div style={{display:'flex',alignItems:'center',gap:10,background:getRoleColor(pendingUser?.role).light,border:`1px solid ${getRoleColor(pendingUser?.role).border}`,borderRadius:10,padding:'10px 14px',marginBottom:20}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:getRoleColor(pendingUser?.role).gradient,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>{getInitials(pendingUser?.name || '')}</div>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:600,color:COLORS.textDark}}>{pendingUser?.name}</div>
              <div style={{fontSize:11,color:COLORS.textLight}}>{email}</div>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:16,textAlign:'left'}}>
            <div>
              <div style={LS.label}>NOUVEAU MOT DE PASSE</div>
              <input style={LS.input} type="password" placeholder="Minimum 6 caracteres" value={newPassword} onChange={e=>{setNewPassword(e.target.value);setError('');}} onKeyPress={handleKeyPress}/>
            </div>
            <div>
              <div style={LS.label}>CONFIRMER LE MOT DE PASSE</div>
              <input style={{...LS.input,border:confirmPassword&&confirmPassword===newPassword?`1px solid ${COLORS.success}`:confirmPassword&&confirmPassword!==newPassword?`1px solid ${COLORS.danger}`:`1px solid ${COLORS.border}`}} type="password" placeholder="Retapez le mot de passe" value={confirmPassword} onChange={e=>{setConfirmPassword(e.target.value);setError('');}} onKeyPress={handleKeyPress}/>
              {confirmPassword && confirmPassword === newPassword && <div style={{fontSize:10,color:COLORS.success,marginTop:4}}>✓ Les mots de passe correspondent</div>}
              {confirmPassword && confirmPassword !== newPassword && <div style={{fontSize:10,color:COLORS.danger,marginTop:4}}>✕ Les mots de passe ne correspondent pas</div>}
            </div>

            {error && (
              <div style={{background:'rgba(220,38,38,0.06)',border:`1px solid rgba(220,38,38,0.25)`,borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14}}>⚠</span>
                <span style={{fontSize:12,color:COLORS.danger,fontWeight:500}}>{error}</span>
              </div>
            )}

            <button onClick={handleChangePassword} style={LS.btn(newPassword&&confirmPassword&&newPassword===confirmPassword, COLORS.success)}>
              Confirmer et se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PAGE CHOIX DE ROLE (People Manager) ═══
  if (showRoleChoice) {
    return (
      <div style={LS.page}>
        <CapLogo/>
        <div style={LS.card}>
          <div style={LS.title}>WorkloadGeo</div>
          <div style={LS.subtitle}>Choisissez votre vue</div>

          <div style={{display:'flex',alignItems:'center',gap:10,background:COLORS.pm.light,border:`1px solid ${COLORS.pm.border}`,borderRadius:10,padding:'10px 14px',marginBottom:20}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:COLORS.pm.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff'}}>{getInitials(authenticatedUser?.name || '')}</div>
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:13,fontWeight:600,color:COLORS.textDark}}>{authenticatedUser?.name}</div>
              <div style={{fontSize:11,color:COLORS.pm.main}}>People Manager</div>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <button onClick={()=>handleRoleChoice('manager')} style={{width:'100%',padding:16,background:COLORS.mgr.light,border:`1px solid ${COLORS.mgr.border}`,borderRadius:12,color:COLORS.mgr.main,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
              Vue Manager — Equipe & KPIs
            </button>
            <button onClick={()=>handleRoleChoice('consultant')} style={{width:'100%',padding:16,background:COLORS.cos.light,border:`1px solid ${COLORS.cos.border}`,borderRadius:12,color:COLORS.cos.main,fontSize:14,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
              Vue Consultant — Declarer ma journee
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ PAGE LOGIN PRINCIPALE ═══
  return (
    <div style={LS.page}>
      <CapLogo/>
      <div style={LS.card}>
        <div style={LS.title}>WorkloadGeo</div>
        <div style={LS.subtitle}>Connectez-vous a votre espace</div>

        <div style={{display:'flex',flexDirection:'column',gap:16,textAlign:'left'}}>

          <div style={{position:'relative'}}>
            <div style={{...LS.label,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span>EMAIL PROFESSIONNEL</span>
            </div>
            <input
              style={{
                ...LS.input,
                background: emailLocked ? '#f1f5f9' : '#f9fafb',
                color: emailLocked ? '#94a3b8' : COLORS.textDark,
                cursor: emailLocked ? 'not-allowed' : 'text',
                border: error && !detectedUser ? `1px solid ${COLORS.danger}` : detectedUser ? `1px solid ${COLORS.success}` : `1px solid ${COLORS.border}`
              }}
              placeholder="prenom.nom@capgemini.com"
              value={email} readOnly={emailLocked}
              onChange={e => handleEmailChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => { if (suggestions.length > 0 && !emailLocked) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && !emailLocked && (
              <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#fff',border:`1px solid ${COLORS.border}`,borderRadius:8,marginTop:4,maxHeight:200,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.1)'}}>
                {suggestions.map((user,i)=>(
                  <div key={i} onMouseDown={()=>selectSuggestion(user)} style={{padding:'10px 14px',cursor:'pointer',borderBottom:i<suggestions.length-1?`1px solid ${COLORS.border}`:'none',display:'flex',justifyContent:'space-between',alignItems:'center'}}
                    onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:COLORS.textDark}}>{user.name}</div>
                      <div style={{fontSize:10,color:COLORS.textLight}}>{user.email}</div>
                    </div>
                    <RoleBadge role={user.role}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {detectedUser && (() => {
            const rc = getRoleColor(detectedUser.role);
            return (
              <div style={{display:'flex',alignItems:'center',gap:10,background:rc.light,border:`1px solid ${rc.border}`,borderRadius:10,padding:'10px 14px'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:rc.gradient,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{getInitials(detectedUser.name)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:COLORS.textDark}}>{detectedUser.name}</div>
                  <div style={{fontSize:11,color:COLORS.textLight}}>
                    {detectedUser.role==='manager'?`Manager · ${MANAGERS_DATA[detectedUser.name]?.cos?.length||0} COS`
                      :detectedUser.role==='people_manager'?`People Manager · ${detectedUser.manager}`
                      :`Consultant · ${detectedUser.suppliersCount} fournisseurs · Manager: ${detectedUser.manager}`}
                  </div>
                </div>
                <RoleBadge role={detectedUser.role}/>
              </div>
            );
          })()}

          <div>
            <div style={LS.label}>MOT DE PASSE</div>
            <div style={{position:'relative'}}>
              <input style={LS.input} type={showPassword?'text':'password'} placeholder="Votre mot de passe" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} onKeyPress={handleKeyPress}/>
              <div onClick={()=>setShowPassword(!showPassword)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:11,color:COLORS.textLight,userSelect:'none'}}>{showPassword?'Masquer':'Afficher'}</div>
            </div>
          </div>

          {error && (
            <div style={{background:'rgba(220,38,38,0.06)',border:`1px solid rgba(220,38,38,0.25)`,borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:14}}>⚠</span>
              <span style={{fontSize:12,color:COLORS.danger,fontWeight:500}}>{error}</span>
            </div>
          )}

          <button onClick={handleSubmit} style={LS.btn(!!detectedUser, detectedUser ? getRoleColor(detectedUser.role).main : COLORS.accent)}>
            {detectedUser?`Se connecter en tant que ${getRoleLabel(detectedUser.role)}`:'Se connecter'}
          </button>

          <div style={{fontSize:10,color:COLORS.textLight,textAlign:'center',marginTop:4}}>
            {ALL_USERS.filter(u=>u.role==='consultant').length} consultants · {ALL_USERS.filter(u=>u.role==='people_manager').length} people managers · {ALL_USERS.filter(u=>u.role==='manager').length} managers
          </div>
        </div>
      </div>
    </div>
  );
};
// ═══ SECTION TITLE ═══
const SectionTitle = ({children}) => <div style={S.sTitle}>{children}<div style={S.sTitleLine}/></div>;

// ═══ TOAST ═══
const Toast = ({msg,show}) => <div style={S.toast(show)}>{msg}</div>;

// ═══ MANAGER SCREENS ═══
const ManagerView = ({showToast, currentUser}) => {
  const [newMemberName, setNewMemberName] = useState('');
const [newMemberRole, setNewMemberRole] = useState('consultant');
const [newMemberPm, setNewMemberPm] = useState('');
const [teamMembers, setTeamMembers] = useState(() => JSON.parse(localStorage.getItem('workload_team_members') || '[]'));
const [editMemberIdx, setEditMemberIdx] = useState(null);
const [editMemberName, setEditMemberName] = useState('');
const [editMemberRole, setEditMemberRole] = useState('');
const [editMemberPm, setEditMemberPm] = useState('');
const saveTeamMembers = (data) => {
  localStorage.setItem('workload_team_members', JSON.stringify(data));
  setTeamMembers(data);
};
  const [kpiPm, setKpiPm] = useState(null);
const [kpiCos, setKpiCos] = useState(null);
  const [tab,setTab] = useState('equipe');
  const [selMgr,setSelMgr] = useState(null);
  const [selCos,setSelCos] = useState(null);
  const [prevMgr,setPrevMgr] = useState(null);
  const [prevCos,setPrevCos] = useState(null);
  const [selDecCos,setSelDecCos] = useState(null);
  const [newSup,setNewSup] = useState('');
  const [showAffDetail, setShowAffDetail] = useState(false);
  const [searchSup, setSearchSup] = useState('');
  const [filterCos, setFilterCos] = useState('');
  const [histDate,setHistDate] = useState('');
  const [histMonth,setHistMonth] = useState('');
  const [histYear,setHistYear] = useState('');
  const [histSearch,setHistSearch] = useState('');
  const [affectations, setAffectations] = useState(() => JSON.parse(localStorage.getItem('workload_affectations') || '[]'));
  const [editIdx, setEditIdx] = useState(null);
  const [editSup, setEditSup] = useState('');
  const [editCos, setEditCos] = useState('');
  // === Agent IA (phase 6.5) ===
  const [aiSingleSup, setAiSingleSup] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposals, setAiProposals] = useState(null);
  const [aiSelected, setAiSelected] = useState(new Set());
  const [aiRejected, setAiRejected] = useState([]);

  // Gestion des réaffectations PM ↔ COS (localStorage)
  const [teamOverrides, setTeamOverrides] = useState(() => JSON.parse(localStorage.getItem('workload_team_overrides') || '[]'));
  const [reassignCos, setReassignCos] = useState('');
  const [reassignPm, setReassignPm] = useState('');
  const [reassignMode, setReassignMode] = useState('move'); // 'move' ou 'add'

  const saveTeamOverrides = (data) => {
    localStorage.setItem('workload_team_overrides', JSON.stringify(data));
    setTeamOverrides(data);
  };

  // Construire la structure d'équipe dynamique (TEAM_STRUCTURE + overrides)
  const getEffectiveTeam = useCallback(() => {
    const team = JSON.parse(JSON.stringify(TEAM_STRUCTURE)); // deep clone

    teamOverrides.forEach(ov => {
      if (ov.type === 'move') {
        // Retirer le COS de son ancien PM
        Object.values(team).forEach(mgr => {
          Object.keys(mgr).forEach(pm => {
            mgr[pm] = mgr[pm].filter(n => n !== ov.cosName);
          });
        });
        // Ajouter au nouveau PM
        Object.values(team).forEach(mgr => {
          if (mgr[ov.toPm] && !mgr[ov.toPm].includes(ov.cosName)) {
            mgr[ov.toPm].push(ov.cosName);
          }
        });
      } else if (ov.type === 'add') {
        Object.values(team).forEach(mgr => {
          if (mgr[ov.toPm] && !mgr[ov.toPm].includes(ov.cosName)) {
            mgr[ov.toPm].push(ov.cosName);
          }
        });
      }
    });
    return team;
  }, [teamOverrides]);

  const effectiveTeam = getEffectiveTeam();

  // Déterminer ce que le user connecté peut voir
  const isManager = currentUser?.role === 'manager';
  const isPeopleManager = currentUser?.originalRole === 'people_manager' && currentUser?.role === 'manager';

  // Trouver le nom du PM si people_manager
  const currentPmName = isPeopleManager ? currentUser.name : null;

  // Trouver le manager parent du PM
  const findManagerOfPm = (pmName) => {
    for (const [mgrName, pms] of Object.entries(effectiveTeam)) {
      if (pms[pmName]) return mgrName;
    }
    return null;
  };

  // COS visibles selon le rôle
  const getVisibleTeam = () => {
    if (isPeopleManager && currentPmName) {
      // PM voit seulement ses COS
      const mgrName = findManagerOfPm(currentPmName);
      if (mgrName && effectiveTeam[mgrName]?.[currentPmName]) {
        return { [currentPmName]: effectiveTeam[mgrName][currentPmName].map(n => findCosData(n)).filter(Boolean) };
      }
      return {};
    }
    if (isManager && currentUser?.name && effectiveTeam[currentUser.name]) {
      // Manager voit tous ses PMs
      const pms = {};
      Object.entries(effectiveTeam[currentUser.name]).forEach(([pmName, cosNames]) => {
        pms[pmName] = cosNames.map(n => findCosData(n)).filter(Boolean);
      });
      return pms;
    }
    return {};
  };

  const visibleTeam = getVisibleTeam();
  const allVisibleCos = Object.values(visibleTeam).flat();

  // Tous les PMs du manager connecté
  const allPmsForManager = isManager && !isPeopleManager && effectiveTeam[currentUser?.name]
    ? Object.keys(effectiveTeam[currentUser.name])
    : [];

  // Tous les COS names pour le select de réaffectation
  const allCosNames = ALL_COS.map(c => c.n);

  // ═══ DETAIL COS ═══
  if(selCos!==null) {
    const c = ALL_COS[selCos];
    if (!c) { setSelCos(null); return null; }
const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
const cosDecl = decl.filter(d => d.Consultant === c.n);
const charge = cosDecl.reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || d['Duree Standard (min)'] || 0), 0);
const col = charge > 480 ? '#DC2626' : charge >= 420 ? '#16A34A' : '#1e9fd4';
const byCat = {};
cosDecl.forEach(d => { const cat = d.Categorie || 'Autre'; if (!byCat[cat]) byCat[cat] = {std:0,reel:0}; byCat[cat].std += d['Duree Standard (min)']||0; byCat[cat].reel += d['Duree Consacree (min)']||d['Duree Reelle (min)']||0; });
const stdD = Object.entries(byCat).slice(0,5).map(([name,v])=>({name:name.substring(0,10),std:v.std,reel:v.reel}));
    return (
      <div>
        <div style={S.topbar}><button style={S.btn('back')} onClick={()=>setSelCos(null)}>Retour</button><div style={S.topTitle}>KPIs — {c.n}</div></div>
        <div style={S.content}>
          <div style={{...S.card,display:'flex',alignItems:'center',gap:16,marginBottom:22}}>
            <div style={{...S.avatar,width:56,height:56,fontSize:20}}>{getInitials(c.n)}</div>
            <div><div style={{fontSize:18,fontWeight:700}}>{c.n}</div><div style={{fontSize:12,color:'#2d3748'}}>{c.s} fournisseurs · {c.t} trips</div><div style={{fontSize:13,fontWeight:600,color:col,marginTop:4}}>Charge: {fmtMin(charge)}</div></div>
          </div>
          <SectionTitle>Standard vs Reel</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stdD}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:11}}/><YAxis tick={{fill:'#2d3748',fontSize:11}}/><Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}}/><Bar dataKey="std" fill="#0070ad" name="Standard"/><Bar dataKey="reel" fill="#ffd700" name="Reel"/></BarChart>
            </ResponsiveContainer>
          </div>
          <SectionTitle>Fournisseurs ({c.s})</SectionTitle>
          <div style={S.grid(2)}>{c.sup.map((s,i)=><div key={i} style={{...S.card,padding:'10px 14px',fontSize:12,display:'flex',alignItems:'center',gap:8}}><span style={{background:'#0070ad',color:'#fff',width:22,height:22,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,flexShrink:0}}>{i+1}</span>{s}</div>)}</div>
        </div>
      </div>
    );
  }

  if(prevCos!==null && prevMgr) {
    const c = ALL_COS[prevCos];
    if (!c) { setPrevCos(null); return null; }
    const days = ['L1','M1','M1','J1','V1','L2','M2','M2','J2','V2','L3','M3','M3','J3','V3','L4','M4','M4','J4','V4'];
    const stdData = days.map(d=>({name:d,std:Math.round(350+Math.random()*180)}));
    stdData.forEach(d=>{d.reel=Math.round(d.std*(0.85+Math.random()*0.4));});
    return (
      <div>
        <div style={S.topbar}><button style={S.btn('back')} onClick={()=>setPrevCos(null)}>Retour</button><div style={S.topTitle}>Previsions — {c.n}</div></div>
        <div style={S.content}>
          <SectionTitle>Histogramme Standard</SectionTitle>
          <div style={S.chartWrap}><ResponsiveContainer width="100%" height={220}><BarChart data={stdData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}}/><YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>Math.round(v/480*100)+'%'}/><Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}}/><Bar dataKey="std" fill="#0070ad"/></BarChart></ResponsiveContainer></div>
          <SectionTitle>Histogramme Reel</SectionTitle>
          <div style={S.chartWrap}><ResponsiveContainer width="100%" height={220}><BarChart data={stdData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}}/><YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>Math.round(v/480*100)+'%'}/><Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}}/><Bar dataKey="reel" fill="#ffd700"/></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    );
  }


  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>{isPeopleManager ? 'Vue People Manager' : 'Vue Manager'} — {currentUser?.name}</div>
        <div style={S.topDesc}>{todayStr()}</div>
      </div>
      <div style={S.content}>
        <div style={{display:'flex',gap:6,marginBottom:18,flexWrap:'wrap'}}>
          {['equipe','globalKpi','declarations','historique','prevMgr','lissage'].map(t=>{
            // PM n'a pas accès au lissage/gestion equipe
            if (isPeopleManager && (t==='lissage' || t==='gestionEquipe')) return null;
            return <div key={t} style={S.tab(tab===t)} onClick={()=>{setTab(t);setSelMgr(null);setPrevMgr(null);setSelDecCos(null);}}>{t==='equipe'?'Mon Equipe':t==='globalKpi'?'KPIs Equipe':t==='declarations'?'Declarations':t==='historique'?'Historique':t==='prevMgr'?'Previsions':'Lissage / Affectation'}</div>;
          })}
          {/* Onglet gestion équipe uniquement pour les vrais managers */}
          {isManager && !isPeopleManager && <div style={S.tab(tab==='gestionEquipe')} onClick={()=>setTab('gestionEquipe')}>Gestion Equipe</div>}
        </div>

        {/* ═══ VUE EQUIPE ═══ */}
        {tab==='equipe' && <div>
          <SectionTitle>{isPeopleManager ? 'Mes Consultants' : 'Mon Equipe'}</SectionTitle>

          {Object.entries(visibleTeam).map(([pmName, cosList]) => (
            <div key={pmName} style={{marginBottom:24}}>
              {/* En-tête PM */}
              {!isPeopleManager && (
                <div style={{
                  display:'flex',alignItems:'center',gap:12,padding:'14px 18px',marginBottom:12,
                  background:'linear-gradient(135deg,rgba(168,85,247,0.12),rgba(168,85,247,0.04))',
                  border:'1px solid rgba(168,85,247,0.3)',borderRadius:12
                }}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>{getInitials(pmName)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:'#000000'}}>{pmName}</div>
                    <div style={{fontSize:11,color:'#a855f7'}}>People Manager · {cosList.length} COS · {cosList.reduce((a,c)=>a+c.s,0)} fournisseurs</div>
                  </div>
                  <div style={{fontSize:22,fontWeight:700,color:'#a855f7'}}>{cosList.length}</div>
                </div>
              )}

              {/* Grille COS */}
              <div style={S.grid(2)}>
                {cosList.map((c, ci) => {
                  // Charge réelle = somme des durées déclarées par ce COS
                  const charge = getRealChargeForCos(c.n);
                  const hasDecl = charge > 0;
                  const globalIdx = ALL_COS.findIndex(ac => ac.n === c.n);
                  return (
                    <div key={ci} style={S.memberCardClean} onClick={() => setSelCos(globalIdx)}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{...S.avatar,background:'rgba(0,112,173,0.12)',color:'#0070AD'}}>{getInitials(c.n)}</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600,color:'#000'}}>{c.n}</div>
                          <div style={{fontSize:11,color:'#2d3748',marginTop:2}}>{c.s} fournisseurs · {c.t} trips</div>
                        </div>
                      </div>
                      <div style={{marginTop:10,height:6,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}>
                        <div style={{height:6,borderRadius:99,width:`${Math.min(100, hasDecl ? (charge/480*100) : 0)}%`,background:'#0070AD',transition:'width .4s'}}/>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,marginTop:6,color:'#2d3748'}}>
                        {hasDecl ? `${fmtMin(charge)} déclaré` : 'Pas encore déclaré'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>}

        {/* ═══ GESTION EQUIPE (Manager uniquement) ═══ */}
        {tab==='gestionEquipe' && isManager && !isPeopleManager && <div>
  {/* ═══ SECTION 1 : Réaffectation COS ↔ PM (existant) ═══ */}
  <SectionTitle>Reassigner / Ajouter un COS a un People Manager</SectionTitle>
  <div style={S.aiCard}>
    <div style={S.aiBadge}>Gestion des equipes</div>
    <div style={{fontSize:14,fontWeight:600,marginBottom:14}}>Deplacer ou ajouter un COS dans l'equipe d'un People Manager</div>
    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>ACTION</div>
        <select style={{...S.select,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)',width:160}} value={reassignMode} onChange={e=>setReassignMode(e.target.value)}>
          <option value="move" style={{background:'#ffffff',color:'#000000'}}>Deplacer un COS</option>
          <option value="add" style={{background:'#ffffff',color:'#000000'}}>Ajouter un COS</option>
        </select>
      </div>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>COS</div>
        <select style={{...S.select,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)'}} value={reassignCos} onChange={e=>setReassignCos(e.target.value)}>
          <option value="" style={{background:'#ffffff',color:'#2d3748'}}>-- Choisir un COS --</option>
          {allCosNames.map((n,i)=><option key={i} value={n} style={{background:'#ffffff',color:'#000000'}}>{n}</option>)}
        </select>
      </div>
      <div style={{flex:1,minWidth:200}}>
        <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>VERS PEOPLE MANAGER</div>
        <select style={{...S.select,background:'#ffffff',color:'#a855f7',border:'1px solid rgba(168,85,247,0.3)'}} value={reassignPm} onChange={e=>setReassignPm(e.target.value)}>
          <option value="" style={{background:'#ffffff',color:'#2d3748'}}>-- Choisir un PM --</option>
          {allPmsForManager.map((pm,i)=><option key={i} value={pm} style={{background:'#ffffff',color:'#000000'}}>{pm}</option>)}
        </select>
      </div>
      <div style={{display:'flex',alignItems:'flex-end'}}>
        <button style={S.btn('accent')} onClick={()=>{
          if(!reassignCos||!reassignPm){showToast('Selectionnez un COS et un PM');return;}
          const newOverride = { type: reassignMode, cosName: reassignCos, toPm: reassignPm, date: new Date().toISOString().split('T')[0] };
          saveTeamOverrides([...teamOverrides, newOverride]);
          showToast(`${reassignCos} ${reassignMode==='move'?'deplace vers':'ajoute a'} ${reassignPm} !`);
          setReassignCos(''); setReassignPm('');
        }}>Confirmer</button>
      </div>
    </div>
  </div>

  {/* Historique des réaffectations */}
  <SectionTitle>Historique des changements ({teamOverrides.length})</SectionTitle>
  {teamOverrides.length === 0 ? (
    <div style={{...S.card, padding:'20px', textAlign:'center', color:'#2d3748', fontSize:13}}>Aucun changement d'equipe effectue.</div>
  ) : (
    <div style={{overflowX:'auto'}}>
      <table style={S.table}>
        <thead><tr>{['#','Action','COS','Vers PM','Date','Annuler'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {teamOverrides.map((ov, i) => (
            <tr key={i}>
              <td style={S.td}>{i+1}</td>
              <td style={S.td}><span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:600,background:ov.type==='move'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)',color:ov.type==='move'?'#D97706':'#16A34A'}}>{ov.type==='move'?'Deplace':'Ajoute'}</span></td>
              <td style={{...S.td,fontWeight:600}}>{ov.cosName}</td>
              <td style={S.td}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:700,color:'#fff'}}>{getInitials(ov.toPm)}</div>{ov.toPm}</div></td>
              <td style={S.td}>{ov.date}</td>
              <td style={S.td}><button style={{padding:'4px 10px',fontSize:10,fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{saveTeamOverrides(teamOverrides.filter((_,j)=>j!==i));showToast('Changement annule');}}>Annuler</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}

  {/* ═══ SECTION 2 : Ajouter/Modifier/Supprimer un membre ═══ */}
  <div style={{marginTop:28}}>
    <SectionTitle>Ajouter un nouveau membre</SectionTitle>
    <div style={{...S.aiCard, border:'1px solid rgba(34,197,94,0.3)', background:'linear-gradient(135deg,rgba(34,197,94,0.06),rgba(34,197,94,0.02))'}}>
      <div style={{...S.aiBadge, background:'#16A34A'}}>Nouveau membre</div>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'flex-end'}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>NOM COMPLET</div>
          <input style={{...S.input,background:'#ffffff',border:'1px solid rgba(34,197,94,0.3)'}} placeholder="Prenom Nom" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)}/>
        </div>
        <div style={{minWidth:160}}>
          <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>ROLE</div>
          <select style={{...S.select,background:'#ffffff',border:'1px solid rgba(34,197,94,0.3)'}} value={newMemberRole} onChange={e=>setNewMemberRole(e.target.value)}>
            <option value="consultant">Consultant (COS)</option>
            <option value="people_manager">People Manager</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        {newMemberRole === 'consultant' && (
          <div style={{minWidth:200}}>
            <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>PEOPLE MANAGER</div>
            <select style={{...S.select,background:'#ffffff',color:'#a855f7',border:'1px solid rgba(168,85,247,0.3)'}} value={newMemberPm} onChange={e=>setNewMemberPm(e.target.value)}>
              <option value="">-- Choisir un PM --</option>
              {allPmsForManager.map((pm,i)=><option key={i} value={pm}>{pm}</option>)}
            </select>
          </div>
        )}
        <button style={S.btn('accent')} onClick={()=>{
          if(!newMemberName.trim()){showToast('Saisissez un nom');return;}
          if(newMemberRole==='consultant'&&!newMemberPm){showToast('Choisissez un People Manager');return;}
          const newMember = {
            name: newMemberName.trim(),
            role: newMemberRole,
            pm: newMemberRole==='consultant'?newMemberPm:'',
            manager: currentUser?.name || '',
            date: new Date().toISOString().split('T')[0]
          };
          saveTeamMembers([...teamMembers, newMember]);
          showToast(`${newMemberName.trim()} ajoute en tant que ${newMemberRole==='consultant'?'COS':newMemberRole==='people_manager'?'People Manager':'Manager'} !`);
          setNewMemberName(''); setNewMemberPm('');
        }}>Confirmer</button>
      </div>
    </div>
  </div>

  {/* Tableau des membres ajoutés */}
  <SectionTitle>Membres ajoutes ({teamMembers.length})</SectionTitle>
  {teamMembers.length === 0 ? (
    <div style={{...S.card, padding:'20px', textAlign:'center', color:'#2d3748', fontSize:13}}>Aucun membre ajoute.</div>
  ) : (
    <div style={{overflowX:'auto',marginBottom:22}}>
      <table style={S.table}>
        <thead><tr>{['#','Nom','Role','People Manager','Date','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {teamMembers.map((m, i) => (
            <tr key={i}>
              <td style={S.td}>{i+1}</td>
              <td style={S.td}>
                {editMemberIdx===i ? (
                  <input style={{...S.input,padding:'4px 8px',fontSize:12,width:180}} value={editMemberName} onChange={e=>setEditMemberName(e.target.value)}/>
                ) : (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{...S.avatar,width:28,height:28,fontSize:10,background:m.role==='manager'?'linear-gradient(135deg,#0D5B2E,#16A34A)':m.role==='people_manager'?'linear-gradient(135deg,#7c3aed,#a855f7)':'linear-gradient(135deg,#0070AD,#12ABDB)'}}>{getInitials(m.name)}</div>
                    <span style={{fontWeight:600}}>{m.name}</span>
                  </div>
                )}
              </td>
              <td style={S.td}>
                {editMemberIdx===i ? (
                  <select style={{...S.select,padding:'4px 8px',fontSize:12,width:140}} value={editMemberRole} onChange={e=>setEditMemberRole(e.target.value)}>
                    <option value="consultant">COS</option>
                    <option value="people_manager">People Manager</option>
                    <option value="manager">Manager</option>
                  </select>
                ) : (
                  <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:600,
                    background:m.role==='manager'?'rgba(13,91,46,0.15)':m.role==='people_manager'?'rgba(168,85,247,0.15)':'rgba(0,112,173,0.15)',
                    color:m.role==='manager'?'#0D5B2E':m.role==='people_manager'?'#a855f7':'#0070AD'
                  }}>{m.role==='manager'?'Manager':m.role==='people_manager'?'People Manager':'COS'}</span>
                )}
              </td>
              <td style={S.td}>
                {editMemberIdx===i && editMemberRole==='consultant' ? (
                  <select style={{...S.select,padding:'4px 8px',fontSize:12,width:180}} value={editMemberPm} onChange={e=>setEditMemberPm(e.target.value)}>
                    <option value="">-- PM --</option>
                    {allPmsForManager.map((pm,j)=><option key={j} value={pm}>{pm}</option>)}
                  </select>
                ) : (
                  m.pm || '-'
                )}
              </td>
              <td style={S.td}>{m.date}</td>
              <td style={{...S.td,minWidth:220}}>
                {editMemberIdx===i ? (
                  <div style={{display:'flex',gap:6}}>
                    <button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'#16A34A',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{
                      if(!editMemberName.trim()){showToast('Nom requis');return;}
                      const u=[...teamMembers];
                      u[i]={...u[i],name:editMemberName.trim(),role:editMemberRole,pm:editMemberRole==='consultant'?editMemberPm:''};
                      saveTeamMembers(u);
                      setEditMemberIdx(null);
                      showToast('Membre modifie !');
                    }}>Sauvegarder</button>
                    <button style={{...S.btn('ghost'),padding:'5px 12px',fontSize:11}} onClick={()=>setEditMemberIdx(null)}>Annuler</button>
                  </div>
                ) : (
                  <div style={{display:'flex',gap:6}}>
                    <button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'rgba(245,158,11,0.15)',color:'#D97706',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{
                      setEditMemberIdx(i);
                      setEditMemberName(m.name);
                      setEditMemberRole(m.role);
                      setEditMemberPm(m.pm || '');
                    }}>Modifier</button>
                    <button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{
                      saveTeamMembers(teamMembers.filter((_,j)=>j!==i));
                      showToast(m.name+' supprime !');
                    }}>Supprimer</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}

  {/* Vue actuelle de l'équipe */}
  <div style={{marginTop:24}}>
    <SectionTitle>Structure actuelle de l'equipe</SectionTitle>
    {Object.entries(visibleTeam).map(([pmName, cosList]) => (
      <div key={pmName} style={{...S.card, marginBottom:14, padding:'14px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff'}}>{getInitials(pmName)}</div>
          <div style={{fontSize:13,fontWeight:700}}>{pmName}</div>
          <span style={{fontSize:11,color:'#a855f7',background:'rgba(168,85,247,0.15)',padding:'2px 10px',borderRadius:20}}>{cosList.length} COS</span>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {cosList.map((c,ci)=>(
            <span key={ci} style={{fontSize:11,padding:'4px 12px',borderRadius:20,background:'rgba(0,196,240,0.1)',color:'#0070AD',border:'1px solid rgba(0,196,240,0.2)'}}>{c.n}</span>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>}

        {/* ═══ KPIs ═══ */}
{tab==='globalKpi' && <div>
  {(() => {
    const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
    const visibleNames = new Set(allVisibleCos.map(c => c.n));
    const myDecl = decl.filter(d => visibleNames.has(d.Consultant));

    // Charge par consultant
    const chargeParCos = {};
    allVisibleCos.forEach(c => { chargeParCos[c.n] = { std: 0, reel: 0, tasks: 0, ongoing: 0, processed: 0, byDate: {}, byCat: {} }; });
    myDecl.forEach(d => {
      const name = d.Consultant;
      if (chargeParCos[name]) {
        const std = d['Duree Standard (min)'] || 0;
        const reel = d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0;
        chargeParCos[name].std += std;
        chargeParCos[name].reel += reel;
        chargeParCos[name].tasks += 1;
        if (d.Status === 'Ongoing') chargeParCos[name].ongoing += 1;
        if (d.Status === 'Processed') chargeParCos[name].processed += 1;
        // Par date
        const dt = d.Date || '';
        if (dt) {
          if (!chargeParCos[name].byDate[dt]) chargeParCos[name].byDate[dt] = { std: 0, reel: 0 };
          chargeParCos[name].byDate[dt].std += std;
          chargeParCos[name].byDate[dt].reel += reel;
        }
        // Par catégorie
        const cat = d.Categorie || 'Autre';
        if (!chargeParCos[name].byCat[cat]) chargeParCos[name].byCat[cat] = 0;
        chargeParCos[name].byCat[cat] += reel || std;
      }
    });

    // Charge par PM
    const chargeParPm = {};
    Object.entries(visibleTeam).forEach(([pmName, cosList]) => {
      chargeParPm[pmName] = { std: 0, reel: 0, tasks: 0, ongoing: 0, processed: 0, cosCount: cosList.length, surcharges: 0, byDate: {}, byCat: {} };
      cosList.forEach(c => {
        const data = chargeParCos[c.n];
        if (data) {
          chargeParPm[pmName].std += data.std;
          chargeParPm[pmName].reel += data.reel;
          chargeParPm[pmName].tasks += data.tasks;
          chargeParPm[pmName].ongoing += data.ongoing;
          chargeParPm[pmName].processed += data.processed;
          if (data.reel > 480) chargeParPm[pmName].surcharges += 1;
          Object.entries(data.byDate).forEach(([dt, v]) => {
            if (!chargeParPm[pmName].byDate[dt]) chargeParPm[pmName].byDate[dt] = { std: 0, reel: 0 };
            chargeParPm[pmName].byDate[dt].std += v.std;
            chargeParPm[pmName].byDate[dt].reel += v.reel;
          });
          Object.entries(data.byCat).forEach(([cat, v]) => {
            if (!chargeParPm[pmName].byCat[cat]) chargeParPm[pmName].byCat[cat] = 0;
            chargeParPm[pmName].byCat[cat] += v;
          });
        }
      });
    });

    // KPIs globaux
    const totalTasks = myDecl.length;
    const totalOngoing = myDecl.filter(d => d.Status === 'Ongoing').length;
    const totalProcessed = myDecl.filter(d => d.Status === 'Processed').length;
    const totalStd = myDecl.reduce((a, d) => a + (d['Duree Standard (min)'] || 0), 0);
    const totalReel = myDecl.reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0), 0);
    const ecart = totalReel - totalStd;
    const efficiency = totalStd > 0 ? Math.round(totalStd / totalReel * 100) : 100;

    // ═══ VUE DETAIL COS ═══
    if (kpiCos) {
      const cosData = chargeParCos[kpiCos] || { std:0, reel:0, tasks:0, ongoing:0, processed:0, byDate:{}, byCat:{} };
      const cosInfo = allVisibleCos.find(c => c.n === kpiCos);
      const cosEcart = cosData.reel - cosData.std;
      const cosEff = cosData.std > 0 ? Math.round(cosData.std / (cosData.reel || 1) * 100) : 100;

      // Tendance par date
      const cosTend = Object.entries(cosData.byDate).sort((a,b) => a[0].localeCompare(b[0])).slice(-15).map(([dt, v]) => ({
        name: dt.substring(5), std: v.std, reel: v.reel
      }));

      // Pareto par catégorie
      const cosCatSorted = Object.entries(cosData.byCat).sort((a,b) => b[1] - a[1]);
      const cosCatTotal = cosCatSorted.reduce((a,[,v]) => a+v, 0);
      let cosCum = 0;
      const cosParetoData = cosCatSorted.map(([name, val]) => {
        cosCum += val;
        return { name: name.substring(0,14), val, cum: cosCatTotal > 0 ? Math.round(cosCum/cosCatTotal*100) : 0 };
      });

      // Tâches détaillées
      const cosDecl = myDecl.filter(d => d.Consultant === kpiCos);

      return <div>
        <button style={{...S.btn('back'),marginBottom:16}} onClick={() => setKpiCos(null)}>Retour a {kpiPm}</button>

        {/* Profil COS */}
        <div style={{...S.card, display:'flex', alignItems:'center', gap:16, marginBottom:22}}>
          <div style={{...S.avatar, width:56, height:56, fontSize:20}}>{getInitials(kpiCos)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700}}>{kpiCos}</div>
            <div style={{fontSize:12,color:'#2d3748'}}>{cosInfo?.s || 0} fournisseurs · {cosInfo?.t || 0} trips · PM: {kpiPm}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#2d3748'}}>Efficacite</div>
            <div style={{fontSize:28,fontWeight:700,color:cosEff>=95?'#16A34A':cosEff>=80?'#D97706':'#DC2626'}}>{cosEff}%</div>
          </div>
        </div>

        {/* KPIs */}
        <div style={{...S.grid(6), marginBottom:22}}>
          <div style={S.card}><div style={S.cardTitle}>Taches</div><div style={S.cardValue}>{cosData.tasks}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Ongoing</div><div style={{...S.cardValue,color:'#D97706'}}>{cosData.ongoing}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Processed</div><div style={{...S.cardValue,color:'#16A34A'}}>{cosData.processed}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Std</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#0070AD'}}>{fmtMin(cosData.std)}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Reel</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#D97706'}}>{fmtMin(cosData.reel)}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Ecart</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:cosEcart>0?'#DC2626':'#16A34A'}}>{cosEcart>0?'+':''}{fmtMin(cosEcart)}</div></div>
        </div>

        {/* Barre de charge */}
        <div style={{...S.card, marginBottom:22, padding:'14px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:8}}>
            <span>Charge journaliere estimee</span>
            <span style={{color:cosData.reel>480?'#DC2626':'#00c4f0',fontWeight:700,...S.mono}}>{fmtMin(cosData.reel)} / 8h00</span>
          </div>
          <div style={{...S.progressTrack,height:12}}><div style={{...S.progressFill(Math.min(150,cosData.reel/480*100), cosData.reel>480),height:12}}/></div>
        </div>

        {/* Tendance */}
        {cosTend.length > 0 && <>
          <SectionTitle>Tendance journaliere</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cosTend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}}/>
                <YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                <Legend/>
                <Line type="monotone" dataKey="std" stroke="#0070ad" name="Standard" strokeWidth={2}/>
                <Line type="monotone" dataKey="reel" stroke="#ffd700" name="Reel" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* Pareto catégorie */}
        {cosParetoData.length > 0 && <>
          <SectionTitle>Repartition par categorie</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={cosParetoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}} angle={-25} textAnchor="end" height={60}/>
                <YAxis yAxisId="left" tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <YAxis yAxisId="right" orientation="right" tick={{fill:'#000000',fontSize:10}} tickFormatter={v=>v+'%'}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={(v,name)=>name==='Cumul %'?v+'%':fmtMin(v)}/>
                <Bar yAxisId="left" dataKey="val" fill="#0070ad" name="Temps" radius={[4,4,0,0]}/>
                <Line yAxisId="right" type="monotone" dataKey="cum" stroke="#ffd700" name="Cumul %" strokeWidth={2}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* Tableau des tâches */}
        <SectionTitle>Detail des taches ({cosDecl.length})</SectionTitle>
        {cosDecl.length === 0 ? (
          <div style={{...S.card, padding:'20px', textAlign:'center', color:'#2d3748'}}>Aucune tache declaree.</div>
        ) : (
          <table style={S.table}>
            <thead><tr>{['Date','Categorie','Tache (Livrable)','Std','Reel','Fournisseur','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>{cosDecl.slice().reverse().map((d,i)=>(
              <tr key={i}>
                <td style={S.td}>{d.Date}</td>
                <td style={S.td}><span style={{fontSize:10,padding:'2px 8px',borderRadius:12,background:'rgba(0,112,173,0.15)',color:'#0070AD'}}>{d.Categorie||'Autre'}</span></td>
                <td style={{...S.td,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{d.Livrable || d.Tache}</td>
                <td style={{...S.td,color:'#0070AD',...S.mono}}>{d['Duree Standard (min)']||'-'}</td>
                <td style={{...S.td,color:'#D97706',...S.mono}}>{d['Duree Consacree (min)']||d['Duree Reelle (min)']||'-'}</td>
                <td style={S.td}>{d['Seller Cofor']||'-'}</td>
                <td style={S.td}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,background:d.Status==='Ongoing'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)',color:d.Status==='Ongoing'?'#D97706':'#16A34A'}}>{d.Status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>;
    }

    // ═══ VUE DETAIL PM ═══
    if (kpiPm) {
      const pmData = chargeParPm[kpiPm] || { std:0, reel:0, tasks:0, ongoing:0, processed:0, cosCount:0, surcharges:0, byDate:{}, byCat:{} };
      const pmCosList = visibleTeam[kpiPm] || [];
      const pmEcart = pmData.reel - pmData.std;
      const pmEff = pmData.std > 0 ? Math.round(pmData.std / (pmData.reel || 1) * 100) : 100;

      // Tendance
      const pmTend = Object.entries(pmData.byDate).sort((a,b) => a[0].localeCompare(b[0])).slice(-15).map(([dt, v]) => ({
        name: dt.substring(5), std: v.std, reel: v.reel
      }));

      // Pareto catégorie
      const pmCatSorted = Object.entries(pmData.byCat).sort((a,b) => b[1] - a[1]);
      const pmCatTotal = pmCatSorted.reduce((a,[,v]) => a+v, 0);
      let pmCum = 0;
      const pmParetoData = pmCatSorted.map(([name, val]) => {
        pmCum += val;
        return { name: name.substring(0,14), val, cum: pmCatTotal > 0 ? Math.round(pmCum/pmCatTotal*100) : 0 };
      });

      // Bar data par COS
      const cosBarData = pmCosList.map(c => {
        const d = chargeParCos[c.n] || { std:0, reel:0 };
        return { name: c.n.split(' ')[0], std: d.std, reel: d.reel };
      });

      return <div>
        <button style={{...S.btn('back'),marginBottom:16}} onClick={() => { setKpiPm(null); setKpiCos(null); }}>Retour aux KPIs globaux</button>

        {/* Profil PM */}
        <div style={{...S.card, display:'flex', alignItems:'center', gap:16, marginBottom:22, borderTop:'3px solid #a855f7'}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#fff'}}>{getInitials(kpiPm)}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700}}>{kpiPm}</div>
            <div style={{fontSize:12,color:'#a855f7'}}>People Manager · {pmData.cosCount} COS</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'#2d3748'}}>Efficacite equipe</div>
            <div style={{fontSize:28,fontWeight:700,color:pmEff>=95?'#16A34A':pmEff>=80?'#D97706':'#DC2626'}}>{pmEff}%</div>
          </div>
        </div>

        {/* KPIs PM */}
        <div style={{...S.grid(6), marginBottom:22}}>
          <div style={S.card}><div style={S.cardTitle}>Taches</div><div style={S.cardValue}>{pmData.tasks}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Ongoing</div><div style={{...S.cardValue,color:'#D97706'}}>{pmData.ongoing}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Processed</div><div style={{...S.cardValue,color:'#16A34A'}}>{pmData.processed}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Std</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#0070AD'}}>{fmtMin(pmData.std)}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Reel</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#D97706'}}>{fmtMin(pmData.reel)}</div></div>
          <div style={S.card}><div style={S.cardTitle}>Ecart</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:pmEcart>0?'#DC2626':'#16A34A'}}>{pmEcart>0?'+':''}{fmtMin(pmEcart)}</div></div>
        </div>

        {/* Graphe std vs reel par COS */}
        {cosBarData.length > 0 && <>
          <SectionTitle>Charge Standard vs Reel par COS</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cosBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}} angle={-25} textAnchor="end" height={50}/>
                <YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                <Legend/>
                <Bar dataKey="std" fill="#0070ad" name="Standard" radius={[4,4,0,0]}/>
                <Bar dataKey="reel" fill="#ffd700" name="Reel" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* Tendance */}
        {pmTend.length > 0 && <>
          <SectionTitle>Tendance journaliere</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pmTend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}}/>
                <YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                <Legend/>
                <Line type="monotone" dataKey="std" stroke="#0070ad" name="Standard" strokeWidth={2}/>
                <Line type="monotone" dataKey="reel" stroke="#ffd700" name="Reel" strokeWidth={2}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* Pareto catégorie */}
        {pmParetoData.length > 0 && <>
          <SectionTitle>Repartition par categorie</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pmParetoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}} angle={-25} textAnchor="end" height={60}/>
                <YAxis yAxisId="left" tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <YAxis yAxisId="right" orientation="right" tick={{fill:'#000000',fontSize:10}} tickFormatter={v=>v+'%'}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={(v,name)=>name==='Cumul %'?v+'%':fmtMin(v)}/>
                <Bar yAxisId="left" dataKey="val" fill="#0070ad" name="Temps" radius={[4,4,0,0]}/>
                <Line yAxisId="right" type="monotone" dataKey="cum" stroke="#ffd700" name="Cumul %" strokeWidth={2}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* Tableau COS cliquable */}
        <SectionTitle>Consultants — cliquez pour les KPIs individuels</SectionTitle>
        <div style={S.grid(2)}>
          {pmCosList.map((c, ci) => {
            const data = chargeParCos[c.n] || { std:0, reel:0, tasks:0, ongoing:0, processed:0 };
            const eff = data.std > 0 ? Math.round(data.std / (data.reel || 1) * 100) : data.tasks > 0 ? 0 : 100;
            const cosEcart = data.reel - data.std;
            return (
              <div key={ci} style={{...S.memberCardClean, cursor:'pointer'}} onClick={() => setKpiCos(c.n)}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{...S.avatar, background:'rgba(0,112,173,0.12)', color:'#0070AD'}}>{getInitials(c.n)}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:'#000'}}>{c.n}</div>
                    <div style={{fontSize:10,color:'#2d3748'}}>{c.s} frs · {data.tasks} taches</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:16,fontWeight:700,color:'#0070AD'}}>{eff}%</div>
                    <div style={{fontSize:9,color:'#2d3748'}}>efficacite</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:10}}>
                  <div><div style={{fontSize:9,color:'#2d3748'}}>Std</div><div style={{fontSize:12,fontWeight:700,color:'#0070AD',...S.mono}}>{fmtMin(data.std)}</div></div>
                  <div><div style={{fontSize:9,color:'#2d3748'}}>Reel</div><div style={{fontSize:12,fontWeight:700,color:'#2d3748',...S.mono}}>{fmtMin(data.reel)}</div></div>
                  <div><div style={{fontSize:9,color:'#2d3748'}}>Ecart</div><div style={{fontSize:12,fontWeight:700,color:'#2d3748',...S.mono}}>{cosEcart>0?'+':''}{fmtMin(cosEcart)}</div></div>
                </div>
                <div style={{marginTop:8,height:6,background:'#e2e8f0',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:6,borderRadius:99,width:`${Math.min(100,eff)}%`,background:'#0070AD'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                  <span style={{fontSize:10,color:'#2d3748'}}>{data.ongoing} ongoing</span>
                  <span style={{fontSize:10,color:'#2d3748'}}>{data.processed} processed</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>;
    }

    // ═══ VUE GLOBALE ═══
    // Bar data par PM
    const pmBarData = Object.entries(chargeParPm).map(([name, data]) => ({
      name: name.split(' ')[0], std: data.std, reel: data.reel
    }));

    return <>
      {/* KPIs globaux */}
      <SectionTitle>KPIs Globaux</SectionTitle>
      <div style={{...S.grid(6), marginBottom:22}}>
        <div style={S.card}><div style={S.cardTitle}>Total taches</div><div style={S.cardValue}>{totalTasks}</div></div>
        <div style={S.card}><div style={S.cardTitle}>Ongoing</div><div style={{...S.cardValue,color:'#D97706'}}>{totalOngoing}</div></div>
        <div style={S.card}><div style={S.cardTitle}>Processed</div><div style={{...S.cardValue,color:'#16A34A'}}>{totalProcessed}</div></div>
        <div style={S.card}><div style={S.cardTitle}>Charge Std</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#0070AD'}}>{fmtMin(totalStd)}</div></div>
        <div style={S.card}><div style={S.cardTitle}>Charge Reel</div><div style={{...S.cardValue,...S.mono,fontSize:18,color:'#D97706'}}>{fmtMin(totalReel)}</div></div>
        <div style={S.card}><div style={S.cardTitle}>Efficacite</div><div style={{...S.cardValue,color:efficiency>=95?'#16A34A':efficiency>=80?'#D97706':'#DC2626'}}>{efficiency}%</div></div>
      </div>

      {/* Ecart */}
      <div style={{...S.aiCard, marginBottom:22}}>
        <div style={S.aiBadge}>Analyse ecart</div>
        <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
          <div><div style={{fontSize:12,color:'#2d3748'}}>Ecart global</div><div style={{fontSize:24,fontWeight:700,color:ecart>0?'#DC2626':'#16A34A',...S.mono}}>{ecart>0?'+':''}{fmtMin(ecart)}</div></div>
          <div><div style={{fontSize:12,color:'#2d3748'}}>Consultants actifs</div><div style={{fontSize:24,fontWeight:700,color:'#0070AD'}}>{Object.values(chargeParCos).filter(d=>d.tasks>0).length} / {allVisibleCos.length}</div></div>
          <div><div style={{fontSize:12,color:'#2d3748'}}>Taux completion</div><div style={{fontSize:24,fontWeight:700,color:totalTasks>0&&totalProcessed/totalTasks>=0.7?'#16A34A':'#D97706'}}>{totalTasks>0?Math.round(totalProcessed/totalTasks*100):0}%</div></div>
        </div>
      </div>

      {/* Cartes PM cliquables */}
      <SectionTitle>People Managers — cliquez pour explorer</SectionTitle>
      <div style={{...S.grid(Object.keys(chargeParPm).length > 3 ? 3 : Object.keys(chargeParPm).length), marginBottom:22}}>
        {Object.entries(chargeParPm).map(([pmName, data]) => {
          const pmEff = data.std > 0 ? Math.round(data.std / (data.reel || 1) * 100) : 100;
          return (
            <div key={pmName} style={{...S.card, borderTop:'3px solid #a855f7', cursor:'pointer', transition:'all .2s'}} onClick={() => { setKpiPm(pmName); setKpiCos(null); }}
              onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>{getInitials(pmName)}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:700}}>{pmName}</div>
                  <div style={{fontSize:10,color:'#a855f7'}}>{data.cosCount} COS</div>
                </div>
                <div style={{fontSize:22,fontWeight:700,color:pmEff>=95?'#16A34A':pmEff>=80?'#D97706':'#DC2626'}}>{pmEff}%</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                <div><div style={{fontSize:9,color:'#2d3748'}}>Taches</div><div style={{fontSize:15,fontWeight:700}}>{data.tasks}</div></div>
                <div><div style={{fontSize:9,color:'#2d3748'}}>Std</div><div style={{fontSize:13,fontWeight:700,color:'#0070AD',...S.mono}}>{fmtMin(data.std)}</div></div>
                <div><div style={{fontSize:9,color:'#2d3748'}}>Reel</div><div style={{fontSize:13,fontWeight:700,color:'#D97706',...S.mono}}>{fmtMin(data.reel)}</div></div>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:10,fontSize:10}}>
                <span style={{color:'#D97706'}}>{data.ongoing} ongoing</span>
                <span style={{color:'#16A34A'}}>{data.processed} processed</span>
                {data.surcharges > 0 && <span style={{color:'#DC2626'}}>{data.surcharges} surcharge{data.surcharges>1?'s':''}</span>}
              </div>
              <div style={{marginTop:6,fontSize:11,color:'#0070AD',textAlign:'center',padding:'4px',background:'rgba(0,196,240,0.06)',borderRadius:6}}>Cliquer pour explorer →</div>
            </div>
          );
        })}
      </div>

      {/* Graphe par PM */}
      {pmBarData.length > 0 && <>
        <SectionTitle>Charge Standard vs Reel par PM</SectionTitle>
        <div style={S.chartWrap}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={pmBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
              <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:11}}/>
              <YAxis tick={{fill:'#2d3748',fontSize:11}} tickFormatter={v=>fmtMin(v)}/>
              <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
              <Legend/>
              <Bar dataKey="std" fill="#0070ad" name="Standard" radius={[4,4,0,0]}/>
              <Bar dataKey="reel" fill="#ffd700" name="Reel" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>}

      {totalTasks === 0 && (
        <div style={{...S.aiCard, textAlign:'center'}}>
          <div style={{fontSize:16,fontWeight:700,color:'#2d3748',marginBottom:8}}>Aucune declaration</div>
          <div style={{fontSize:12,color:'#2d3748'}}>Les KPIs s'afficheront quand les consultants declareront leur workload.</div>
        </div>
      )}
    </>;
  })()}
</div>}

        {/* ═══ PREVISIONS ═══ */}
        {tab==='prevMgr' && !prevMgr && <div>
          <SectionTitle>Previsions par People Manager</SectionTitle>
          <div style={S.grid(2)}>
            {Object.entries(visibleTeam).map(([pmName, cosList]) => (
              <div key={pmName} style={S.memberCardClean} onClick={()=>setPrevMgr(pmName)}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff'}}>{getInitials(pmName)}</div>
                <div style={{fontSize:13,fontWeight:600,marginTop:8,color:'#000'}}>{pmName}</div>
                <div style={{fontSize:11,color:'#2d3748',marginTop:2}}>{cosList.length} COS</div>
                <div style={{fontSize:11,color:'#0070AD',marginTop:5}}>Cliquez pour les previsions</div>
              </div>
            ))}
          </div>
        </div>}

        {tab==='prevMgr' && prevMgr && <div>
          <button style={{...S.btn('back'),marginBottom:16}} onClick={()=>setPrevMgr(null)}>Retour</button>
          <div style={{fontSize:16,fontWeight:700,marginBottom:14}}>Previsions — {prevMgr}</div>
          <div style={S.grid(2)}>
            {(visibleTeam[prevMgr] || []).map((c, i) => {
              const cosCharge = getRealChargeForCos(c.n);
              const pct = Math.round(cosCharge/480*100);
              const globalIdx = ALL_COS.findIndex(ac => ac.n === c.n);
              return <div key={i} style={S.memberCardClean} onClick={()=>setPrevCos(globalIdx)}>
                <div style={{...S.avatar, background:'rgba(0,112,173,0.12)', color:'#0070AD'}}>{getInitials(c.n)}</div>
                <div style={{fontSize:13,fontWeight:600,marginTop:8,color:'#000'}}>{c.n}</div>
                <div style={{fontSize:11,color:'#2d3748',marginTop:5}}>Prevision : {pct}% · {fmtMin(cosCharge)}</div>
              </div>;
            })}
          </div>
        </div>}

        {/* ═══ DECLARATIONS ═══ */}
        {tab==='declarations' && <div>
          <SectionTitle>Declarations des consultants</SectionTitle>
          {(() => {
            const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
            // Filtrer par équipe visible
            const visibleNames = new Set(allVisibleCos.map(c => c.n));
            const filtered = decl.filter(d => visibleNames.has(d.Consultant));
            if (filtered.length === 0) return <div style={{...S.card,padding:'20px',textAlign:'center',color:'#2d3748'}}>Aucune declaration pour le moment.</div>;
            const byConsultant = {};
            filtered.forEach(d => {
              const name = d.Consultant || 'Inconnu';
              if (!byConsultant[name]) byConsultant[name] = {totalStd:0,totalReal:0,tasks:0,lastDate:''};
              byConsultant[name].totalStd += d['Duree Standard (min)'] || 0;
              byConsultant[name].totalReal += d['Duree Reelle (min)'] || 0;
              byConsultant[name].tasks += 1;
              if (d.Date > byConsultant[name].lastDate) byConsultant[name].lastDate = d.Date;
            });
            return selDecCos ? <div>
              <button style={{...S.btn('back'),marginBottom:16}} onClick={()=>setSelDecCos(null)}>Retour</button>
              <div style={{...S.card,display:'flex',alignItems:'center',gap:16,marginBottom:22}}>
                <div style={{...S.avatar,width:56,height:56,fontSize:20}}>{getInitials(selDecCos)}</div>
                <div style={{flex:1}}><div style={{fontSize:18,fontWeight:700}}>{selDecCos}</div><div style={{fontSize:12,color:'#2d3748'}}>{byConsultant[selDecCos]?.tasks||0} taches</div></div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:12,color:'#2d3748'}}>Std: <span style={{color:'#0070AD',fontWeight:700}}>{fmtMin(byConsultant[selDecCos]?.totalStd||0)}</span></div>
                  <div style={{fontSize:12,color:'#2d3748'}}>Reel: <span style={{color:'#D97706',fontWeight:700}}>{fmtMin(byConsultant[selDecCos]?.totalReal||0)}</span></div>
                </div>
              </div>
              <table style={S.table}>
                <thead><tr>{['Date','Tache (Livrable)','Std','Reel','Seller','Status'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{filtered.filter(d=>d.Consultant===selDecCos).reverse().map((d,i)=><tr key={i}>
                  <td style={S.td}>{d.Date}</td><td style={{...S.td,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{d.Livrable || d.Tache}</td>
                  <td style={{...S.td,color:'#0070AD'}}>{d['Duree Standard (min)']}</td>
                  <td style={{...S.td,color:'#D97706'}}>{d['Duree Reelle (min)']}</td>
                  <td style={S.td}>{d['Seller Cofor']}</td>
                  <td style={S.td}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,background:d.Status==='Ongoing'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)',color:d.Status==='Ongoing'?'#D97706':'#16A34A'}}>{d.Status}</span></td>
                </tr>)}</tbody>
              </table>
            </div> : <div>
              <table style={S.table}>
                <thead><tr>{['Consultant','Taches','Std','Reel','Derniere date'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>{Object.entries(byConsultant).map(([name,data],i)=><tr key={i} style={{cursor:'pointer'}} onClick={()=>setSelDecCos(name)}>
                  <td style={S.td}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{...S.avatar,width:28,height:28,fontSize:10}}>{getInitials(name)}</div>{name}</div></td>
                  <td style={S.td}>{data.tasks}</td>
                  <td style={{...S.td,color:'#0070AD'}}>{fmtMin(data.totalStd)}</td>
                  <td style={{...S.td,color:'#D97706'}}>{fmtMin(data.totalReal)}</td>
                  <td style={S.td}>{data.lastDate}</td>
                </tr>)}</tbody>
              </table>
            </div>;
          })()}
        </div>}

        {/* ═══ HISTORIQUE ═══ */}
        {tab==='historique' && <div>
          <SectionTitle>Historique des taches</SectionTitle>
          {(() => {
            const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
            const visibleNames = new Set(allVisibleCos.map(c => c.n));
            let filtered = decl.filter(d => visibleNames.has(d.Consultant));
            const allConsultants = [...new Set(filtered.map(d => d.Consultant || 'Inconnu'))].sort();

            if (selDecCos) filtered = filtered.filter(d => d.Consultant === selDecCos);
            if (histSearch && !selDecCos) filtered = filtered.filter(d => (d.Consultant || '').toLowerCase().includes(histSearch.toLowerCase()));
            if (histDate) filtered = filtered.filter(d => d.Date === histDate || d['Date Cloture'] === histDate);
            if (histMonth && !histDate) filtered = filtered.filter(d => { const dt = d['Date Cloture'] || d.Date || ''; return dt.substring(5, 7) === histMonth; });
            if (histYear && !histDate) filtered = filtered.filter(d => { const dt = d['Date Cloture'] || d.Date || ''; return dt.substring(0, 4) === histYear; });

            const ongoing = filtered.filter(d => d.Status === 'Ongoing');
            const processed = filtered.filter(d => d.Status === 'Processed');
            const totalStdF = filtered.reduce((a, d) => a + (d['Duree Standard (min)'] || 0), 0);
            const totalReelF = filtered.reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0), 0);

            const handleExportExcel = () => {
              if (filtered.length === 0) { showToast('Aucune donnee a exporter'); return; }
              const exportData = filtered.map(d => ({'Consultant':d.Consultant,'Date':d.Date,'Tache':d.Tache,'Livrable':d.Livrable||d.Tache,'Categorie':d.Categorie,'Duree Standard (min)':d['Duree Standard (min)'],'Duree Reelle (min)':d['Duree Reelle (min)'],'Duree Consacree (min)':d['Duree Consacree (min)']||'','Seller Cofor':d['Seller Cofor'],'Pack':d.Pack,'Load ID':d['Load ID'],'TO':d.TO||'','DN Number':d['DN Number']||'','XF Code':d['XF Code']||'','Note':d.Note||'','Status':d.Status,'Date Cloture':d['Date Cloture']||''}));
              const ws = XLSX.utils.json_to_sheet(exportData);
              ws['!cols'] = [{wch:20},{wch:12},{wch:30},{wch:50},{wch:20},{wch:18},{wch:18},{wch:18},{wch:15},{wch:12},{wch:12},{wch:10},{wch:12},{wch:10},{wch:30},{wch:12},{wch:14}];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Historique');
              XLSX.writeFile(wb, `Historique_${new Date().toISOString().split('T')[0]}.xlsx`);
              showToast('Fichier Excel telecharge !');
            };

            return <div>
              <div style={{...S.card, padding:'14px 18px', marginBottom:16, display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end'}}>
                <div style={{flex:1, minWidth:180}}>
                  <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>CONSULTANT</div>
                  <select style={{...S.select,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)'}} value={selDecCos || ''} onChange={e => setSelDecCos(e.target.value || null)}>
                    <option value="" style={{background:'#ffffff',color:'#2d3748'}}>-- Tous --</option>
                    {allConsultants.map((c, i) => <option key={i} value={c} style={{background:'#ffffff',color:'#000000'}}>{c}</option>)}
                  </select>
                </div>
                <div><div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>DATE</div><input type="date" style={{...S.input, width:150, fontSize:11}} value={histDate} onChange={e => setHistDate(e.target.value)}/></div>
                <div><div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>MOIS</div><select style={{...S.select,width:120,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)'}} value={histMonth} onChange={e => setHistMonth(e.target.value)}><option value="">Tous</option>{MONTHS.map((m, i) => <option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></div>
                <div><div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>ANNEE</div><select style={{...S.select,width:100,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)'}} value={histYear} onChange={e => setHistYear(e.target.value)}><option value="">Toutes</option>{[2024,2025,2026,2027].map(y => <option key={y} value={String(y)}>{y}</option>)}</select></div>
              </div>
              <div style={{display:'flex', gap:10, marginBottom:16}}>
                <button style={S.btn('ghost')} onClick={()=>{setHistDate('');setHistMonth('');setHistYear('');setHistSearch('');setSelDecCos(null);}}>Reinitialiser</button>
                <button style={{...S.btn('accent'), background:'#16A34A'}} onClick={handleExportExcel}>Exporter Excel</button>
              </div>
              <div style={{...S.grid(4), marginBottom:18}}>
                <div style={S.card}><div style={S.cardTitle}>Total</div><div style={S.cardValue}>{filtered.length}</div></div>
                <div style={S.card}><div style={S.cardTitle}>Ongoing</div><div style={{...S.cardValue,color:'#D97706'}}>{ongoing.length}</div></div>
                <div style={S.card}><div style={S.cardTitle}>Processed</div><div style={{...S.cardValue,color:'#16A34A'}}>{processed.length}</div></div>
                <div style={S.card}><div style={S.cardTitle}>Charge</div><div style={{...S.cardValue,...S.mono,color:'#0070AD',fontSize:18}}>{fmtMin(totalReelF || totalStdF)}</div></div>
              </div>
              {filtered.length === 0 ? <div style={{...S.card,padding:'20px',textAlign:'center',color:'#2d3748'}}>Aucune tache trouvee.</div> : (
                <table style={S.table}>
                  <thead><tr>{['Consultant','Date','Tache (Livrable)','Std','Reel','Fournisseur','Status','Cloture'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                  <tbody>{filtered.slice().reverse().map((d, i) => (
                    <tr key={i}>
                      <td style={S.td}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{...S.avatar,width:24,height:24,fontSize:9}}>{getInitials(d.Consultant||'IN')}</div><span style={{fontSize:12}}>{d.Consultant}</span></div></td>
                      <td style={S.td}>{d.Date}</td><td style={{...S.td,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{d.Livrable || d.Tache}</td>
                      <td style={{...S.td,color:'#0070AD'}}>{d['Duree Standard (min)']||'-'}</td>
                      <td style={{...S.td,color:'#D97706'}}>{d['Duree Consacree (min)']||d['Duree Reelle (min)']||'-'}</td>
                      <td style={S.td}>{d['Seller Cofor']||'-'}</td>
                      <td style={S.td}><span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,background:d.Status==='Ongoing'?'rgba(245,158,11,0.15)':'rgba(34,197,94,0.15)',color:d.Status==='Ongoing'?'#D97706':'#16A34A'}}>{d.Status}</span></td>
                      <td style={S.td}>{d['Date Cloture']||'-'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>;
          })()}
        </div>}

        {/* ═══ LISSAGE ═══ */}
        {tab==='lissage' && <div>
          <SectionTitle>Gestion des affectations fournisseurs</SectionTitle>
          {(() => {
            const saveAffectations = (data) => { localStorage.setItem('workload_affectations', JSON.stringify(data)); setAffectations(data); };
            const handleAffecter = () => {
              if (!newSup.trim()) return;
              const cosName = document.getElementById('lissage-cos-select')?.value || allVisibleCos[0]?.n;
              const supplierName = newSup.trim(); const sMap = JSON.parse(localStorage.getItem('workload_suppliers_map') || '{}'); const findSupplier = (n) => { if (sMap[n]) return n; const low = n.toLowerCase(); for (const k of Object.keys(sMap)) { if (k.toLowerCase() === low) return k; } return null; }; const matched = findSupplier(supplierName); if (!matched) { if (isManager) { if (!window.confirm('Le fournisseur ' + supplierName + ' n existe pas. Creer ce nouveau fournisseur ?')) return; api.createSupplier(supplierName).then(created => { const newMap = {...sMap, [created.name]: created.id}; localStorage.setItem('workload_suppliers_map', JSON.stringify(newMap)); const newItem = { supplier: created.name, cos: cosName, date: new Date().toISOString().split('T')[0] }; pushAffectationToBackend(newItem).then(c => { if (c && c.id) saveAffectations([...affectations, { ...newItem, _backend_id: c.id }]); else saveAffectations([...affectations, newItem]); }); showToast('Nouveau fournisseur ' + created.name + ' cree et affecte !'); setNewSup(''); }).catch(err => showToast('Erreur creation: ' + err.message)); return; } else { showToast('Fournisseur inexistant. Contactez votre manager pour l ajouter.'); return; } } const newItem = { supplier: matched, cos: cosName, date: new Date().toISOString().split('T')[0] }; pushAffectationToBackend(newItem).then(created => { if (created && created.id) { saveAffectations([...affectations, { ...newItem, _backend_id: created.id }]); } else { saveAffectations([...affectations, newItem]); } showToast(matched + ' affecte !'); setNewSup(''); });
            };
            const handleSupprimer = (idx) => { const removed = affectations[idx]; if (removed?._backend_id) deleteAffectationFromBackend(removed._backend_id); saveAffectations(affectations.filter((_,i)=>i!==idx)); showToast((removed?.supplier || '') + ' supprime !'); };
            const handleModifier = (idx) => { setEditIdx(idx); setEditSup(affectations[idx].supplier); setEditCos(affectations[idx].cos); };
            const handleSaveEdit = () => { if(!editSup.trim())return; const supplierName = editSup.trim(); const sMap = JSON.parse(localStorage.getItem('workload_suppliers_map') || '{}'); const findSupplier = (n) => { if (sMap[n]) return n; const low = n.toLowerCase(); for (const k of Object.keys(sMap)) { if (k.toLowerCase() === low) return k; } return null; }; const matched = findSupplier(supplierName); const applyEdit = (finalSupplier) => { const oldItem = affectations[editIdx]; const newItem = {...oldItem, supplier: finalSupplier, cos: editCos}; if (oldItem?._backend_id) deleteAffectationFromBackend(oldItem._backend_id); pushAffectationToBackend(newItem).then(created => { const u=[...affectations]; u[editIdx] = created?.id ? {...newItem, _backend_id: created.id} : {...newItem, _backend_id: undefined}; saveAffectations(u); }); setEditIdx(null); showToast('Modifiee : ' + finalSupplier); }; if (!matched) { if (isManager) { if (!window.confirm('Le fournisseur ' + supplierName + ' n existe pas. Creer ce nouveau fournisseur ?')) return; api.createSupplier(supplierName).then(created => { const newMap = {...sMap, [created.name]: created.id}; localStorage.setItem('workload_suppliers_map', JSON.stringify(newMap)); applyEdit(created.name); }).catch(err => showToast('Erreur creation: ' + err.message)); return; } else { showToast('Fournisseur inexistant. Contactez votre manager pour l ajouter.'); return; } } applyEdit(matched); };
            // === Handlers Agent IA (phase 6.5.3) ===
            const handleAiPropose1 = async () => {
              if (!aiSingleSup.trim()) return;
              setAiLoading(true);
              setAiProposals([]);
              try {
                const data = await api.proposeAssignments([aiSingleSup.trim()]);
                const props = data.proposals || [];
                setAiProposals(props);
                setAiSelected(new Set(props.map((_, i) => i)));
                setAiRejected(data.rejected || []);
              } catch (err) {
                showToast('Erreur IA : ' + err.message);
                setAiProposals(null);
              } finally {
                setAiLoading(false);
              }
            };
            const handleAiConfirm = async () => {
              const selected = aiProposals.filter((_, i) => aiSelected.has(i));
              if (selected.length === 0) return;
              setAiLoading(true);
              try {
                const data = await api.confirmAssignments(selected);
                const sMap = JSON.parse(localStorage.getItem('workload_suppliers_map') || '{}');
                const newMap = {...sMap};
                const newAffs = (data.created_assignments || []).map(a => {
                  newMap[a.supplier_name] = a.supplier_id;
                  return {
                    supplier: a.supplier_name,
                    cos: a.consultant_name,
                    date: (a.assigned_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
                    _backend_id: a.id,
                    _ai: true,
                  };
                });
                localStorage.setItem('workload_suppliers_map', JSON.stringify(newMap));
                saveAffectations([...affectations, ...newAffs]);
                const errs = data.errors || [];
                if (errs.length) console.warn('Erreurs IA:', errs);
                showToast((data.created_assignments || []).length + ' affectation(s) IA validee(s) !');
                setAiProposals(null);
                setAiSelected(new Set());
                setAiRejected([]);
                setAiSingleSup('');
              } catch (err) {
                showToast('Erreur confirmation : ' + err.message);
              } finally {
                setAiLoading(false);
              }
            };
            const handleAiImport = async (file) => {
              if (!file) return;
              if (file.size > 1024 * 1024) {
                showToast('Fichier trop volumineux (max 1 MB)');
                return;
              }
              try {
                const fname = file.name.toLowerCase();
                let lines = [];
                if (fname.endsWith('.xlsx') || fname.endsWith('.xls')) {
                  const buf = await file.arrayBuffer();
                  const wb = XLSX.read(buf, { type: 'array' });
                  const sheet = wb.Sheets[wb.SheetNames[0]];
                  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                  const HEADER_KEYWORDS = ['nom','nom fournisseur','fournisseur','supplier','supplier name','name','company','nombre','id','sup'];
                  let allRows = rows.map(r => String(r[0] || '').trim());
                  if (allRows.length > 0 && HEADER_KEYWORDS.includes(allRows[0].toLowerCase())) {
                    allRows = allRows.slice(1);
                  }
                  lines = allRows.filter(l => l.length > 0);
                } else {
                  const text = await file.text();
                  lines = text
                    .split(/\r?\n/)
                    .map(l => l.split(/[,;\t]/)[0].trim())
                    .filter(l => l.length > 0);
                }
                const unique = [...new Set(lines)];
                if (unique.length === 0) {
                  showToast('Fichier vide ou invalide');
                  return;
                }
                if (unique.length > 200) {
                  showToast('Trop de fournisseurs (' + unique.length + ', max 200)');
                  return;
                }
                setAiLoading(true);
                setAiProposals([]);
                const data = await api.proposeAssignments(unique);
                const props = data.proposals || [];
                setAiProposals(props);
                setAiSelected(new Set(props.map((_, i) => i)));
                setAiRejected(data.rejected || []);
                if (props.length < unique.length) {
                  console.warn('IA n a propose que ' + props.length + '/' + unique.length + ' affectations');
                }
              } catch (err) {
                showToast('Erreur import : ' + err.message);
                setAiProposals(null);
              } finally {
                setAiLoading(false);
              }
            };

            const declData = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
            const chargeParCos = {};
            allVisibleCos.forEach(c => { chargeParCos[c.n] = c.s * 8; });
            declData.forEach(d => { if(chargeParCos[d.Consultant]!==undefined) chargeParCos[d.Consultant]+=(d['Duree Consacree (min)']||d['Duree Reelle (min)']||d['Duree Standard (min)']||0); });
            affectations.forEach(a => { if(chargeParCos[a.cos]!==undefined) chargeParCos[a.cos]+=8; });
            const cosSorted = [...allVisibleCos].sort((a,b)=>(chargeParCos[a.n]||0)-(chargeParCos[b.n]||0));
            const selectLisible = {...S.select,background:'#ffffff',color:'#0070AD',fontSize:13,fontWeight:600,border:'1px solid rgba(0,196,240,0.3)'};

            return <>
              {/* === BLOC AGENT IA (phase 6.5) === */}
              <div style={S.aiCard}>
                <div style={S.aiBadge}>Affectation par IA</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>
                  L'agent IA analyse la charge de chaque consultant et propose la meilleure repartition
                </div>

                {/* Mode rapide : 1 fournisseur */}
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>FOURNISSEUR (1 a la fois)</div>
                  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                    <input
                      style={{...S.input,flex:1,minWidth:200}}
                      placeholder="Ex: Robert Bosch"
                      value={aiSingleSup}
                      onChange={e=>setAiSingleSup(e.target.value)}
                      disabled={aiLoading}
                    />
                    <button
                      style={S.btn('accent')}
                      onClick={handleAiPropose1}
                      disabled={aiLoading || !aiSingleSup.trim()}
                    >
                      {aiLoading ? 'IA en cours...' : 'Affecter avec IA'}
                    </button>
                  </div>
                </div>

                {/* Separateur */}
                <div style={{height:1,background:'#e2e8f0',margin:'14px 0'}}/>

                {/* Mode batch : import fichier */}
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>IMPORT EN MASSE (.txt, .csv ou .xlsx, 1 fournisseur par ligne)</div>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <input
                      type="file"
                      accept=".txt,.csv,.xlsx,.xls"
                      onChange={e=>{ const f = e.target.files && e.target.files[0]; e.target.value = ''; handleAiImport(f); }}
                      disabled={aiLoading}
                      style={{fontSize:12,fontFamily:'inherit'}}
                    />
                    <span style={{fontSize:11,color:'#2d3748'}}>
                      Le fichier sera analyse par l'IA, vous validerez les propositions avant ecriture.
                    </span>
                  </div>
                </div>
              </div>

              <div style={S.aiCard}>
                <div style={S.aiBadge}>Recommandation lissage</div>
                <div style={{fontSize:14,fontWeight:600,marginBottom:12}}>Recommande le COS avec la plus grande capacite residuelle</div>
                <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                  <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>FOURNISSEUR</div><input style={S.input} placeholder="Ex: Robert Bosch" value={newSup} onChange={e=>setNewSup(e.target.value)}/></div>
                  <div style={{flex:1,minWidth:200}}><div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>AFFECTER A</div><select id="lissage-cos-select" style={selectLisible}>{cosSorted.map((c,i)=>{const cap=Math.max(0,480-(chargeParCos[c.n]||0));return <option key={i} value={c.n} style={{background:'#ffffff',color:'#000000'}}>{c.n} — dispo: {fmtMin(cap)}</option>;})}</select></div>
                  <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                    <button style={S.btn('accent')} onClick={handleAffecter}>Affecter</button>
                    <button style={{padding:'7px 16px',fontSize:12,fontWeight:600,background:'rgba(245,158,11,0.15)',color:'#D97706',border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{if(!affectations.length){showToast('Rien a modifier');return;}handleModifier(affectations.length-1);}}>Modifier</button>
                    <button style={{padding:'7px 16px',fontSize:12,fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{if(!affectations.length){showToast('Rien a supprimer');return;}handleSupprimer(affectations.length-1);}}>Supprimer</button>
                  </div>
                </div>
              </div>

              <SectionTitle>Affectations ({affectations.length})</SectionTitle>
              {affectations.length===0?<div style={{...S.card,padding:'20px',textAlign:'center',color:'#2d3748'}}>Aucune affectation.</div>:(
                <>
                  {/* SYNTHESE mini-cards par consultant */}
                  <div style={S.grid(4)}>
                    {cosSorted.map((c,i)=>{
                      const nbAff = affectations.filter(a => a.cos === c.n).length;
                      const charge = chargeParCos[c.n] || 0;
                      const cap = Math.max(0, 480 - charge);
                      return <div key={i} style={S.card}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                          <div style={{...S.avatar,width:28,height:28,fontSize:10,background:'rgba(0,112,173,0.12)',color:'#0070AD'}}>{getInitials(c.n)}</div>
                          <div style={{fontSize:12,fontWeight:600,flex:1,color:'#000'}}>{c.n.split(' ')[0]}</div>
                        </div>
                        <div style={{fontSize:24,fontWeight:700,color:'#0070AD',textAlign:'center',marginBottom:4,...S.mono}}>{nbAff}</div>
                        <div style={{fontSize:10,color:'#2d3748',textAlign:'center',marginBottom:8}}>fournisseurs</div>
                        <div style={{fontSize:10,color:'#2d3748',textAlign:'center'}}>Dispo : <span style={{fontWeight:600,color:'#16A34A'}}>{fmtMin(cap)}</span></div>
                      </div>;
                    })}
                  </div>
                  {/* Bouton detail replie */}
                  <div style={{textAlign:'center',margin:'22px 0'}}>
                    <button style={{...S.btn('ghost'),fontSize:12,padding:'8px 18px'}} onClick={()=>setShowAffDetail(!showAffDetail)}>
                      {showAffDetail ? 'Masquer le detail' : 'Voir le detail des ' + affectations.length + ' affectations'}
                    </button>
                  </div>
                  {/* Zone de detail filtree, repliable */}
                  {showAffDetail && <div style={{marginBottom:22}}>
                    <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}>
                      <input style={{...S.input,flex:1,minWidth:220}} placeholder='Rechercher un fournisseur...' value={searchSup} onChange={e=>setSearchSup(e.target.value)}/>
                      <select style={{...selectLisible,minWidth:220}} value={filterCos} onChange={e=>setFilterCos(e.target.value)}>
                        <option value=''>Tous les consultants</option>
                        {cosSorted.map((c,i)=><option key={i} value={c.n} style={{background:'#ffffff',color:'#000000'}}>{c.n}</option>)}
                      </select>
                    </div>
                    {(() => {
                      const filtered = affectations.filter(a => {
                        if (searchSup && !a.supplier.toLowerCase().includes(searchSup.toLowerCase())) return false;
                        if (filterCos && a.cos !== filterCos) return false;
                        return true;
                      });
                      if (filtered.length === 0) return <div style={{...S.card,padding:'20px',textAlign:'center',color:'#2d3748'}}>Aucun resultat.</div>;
                      return <div style={{overflowX:'auto'}}><table style={S.table}>
                        <thead><tr>{['#','Fournisseur','COS','Date','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                        <tbody>{filtered.map((a,i)=>{ const realIdx = affectations.indexOf(a); return <tr key={realIdx}>
                          <td style={{...S.td,width:40}}>{realIdx+1}</td>
                          <td style={S.td}>{editIdx===realIdx?<input style={{...S.input,padding:'4px 8px',fontSize:12,width:180}} value={editSup} onChange={e=>setEditSup(e.target.value)}/>:<span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{fontWeight:600}}>{a.supplier}</span>{a._ai && <span title="Affecte par l'agent IA" style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:10,background:'rgba(124,58,237,0.15)',color:'#7c3aed',border:'1px solid rgba(124,58,237,0.3)',display:'inline-flex',alignItems:'center',gap:3}}>IA</span>}</span>}</td>
                          <td style={S.td}>{editIdx===realIdx?<select style={{...selectLisible,padding:'4px 8px',fontSize:12,width:200}} value={editCos} onChange={e=>setEditCos(e.target.value)}>{allVisibleCos.map((c,j)=><option key={j} value={c.n} style={{background:'#ffffff',color:'#000000'}}>{c.n}</option>)}</select>:<div style={{display:'flex',alignItems:'center',gap:6}}><div style={{...S.avatar,width:24,height:24,fontSize:9}}>{getInitials(a.cos)}</div>{a.cos}</div>}</td>
                          <td style={S.td}>{a.date}</td>
                          <td style={{...S.td,minWidth:200}}>{editIdx===realIdx?<div style={{display:'flex',gap:6}}><button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'#16A34A',color:'#fff',border:'none',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={handleSaveEdit}>Sauvegarder</button><button style={{...S.btn('ghost'),padding:'5px 12px',fontSize:11}} onClick={()=>setEditIdx(null)}>Annuler</button></div>:<div style={{display:'flex',gap:6}}><button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'rgba(245,158,11,0.15)',color:'#D97706',border:'1px solid rgba(245,158,11,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>handleModifier(realIdx)}>Modifier</button><button style={{padding:'5px 12px',fontSize:11,fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>handleSupprimer(realIdx)}>Supprimer</button></div>}</td>
                        </tr>;})}</tbody>
                      </table></div>;
                    })()}
                  </div>}
                </>
              )}

              <SectionTitle>Capacite residuelle</SectionTitle>
              <div style={S.grid(4)}>{cosSorted.map((c,i)=>{const charge=chargeParCos[c.n]||0;const cap=Math.max(0,480-charge);const pct=Math.round(charge/480*100);return <div key={i} style={S.card}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><div style={{...S.avatar,width:28,height:28,fontSize:10,background:'rgba(0,112,173,0.12)',color:'#0070AD'}}>{getInitials(c.n)}</div><div style={{fontSize:12,fontWeight:600,flex:1,color:'#000'}}>{c.n.split(' ')[0]}</div></div><div style={{height:8,background:'#e2e8f0',borderRadius:99,marginBottom:6,overflow:'hidden'}}><div style={{height:8,borderRadius:99,width:`${Math.min(100,pct)}%`,background:'#0070AD'}}/></div><div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}><div style={{fontSize:16,fontWeight:700,color:'#0070AD',...S.mono}}>{fmtMin(cap)}</div><div style={{fontSize:10,color:'#2d3748'}}>{c.s} frs · {pct}%</div></div></div>;})}</div>
              {/* === MODAL AGENT IA (phase 6.5.2) === */}
              {aiProposals !== null && (
                <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9998,padding:20}}
                     onClick={(e)=>{ if(e.target===e.currentTarget && !aiLoading) setAiProposals(null); }}>
                  <div style={{background:'#ffffff',borderRadius:14,maxWidth:900,width:'100%',maxHeight:'85vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',overflow:'hidden'}}>
                    {/* Header */}
                    <div style={{padding:'18px 24px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',gap:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:'#0070AD',flex:1}}>
                        Propositions de l'agent IA
                      </div>
                      <button
                        style={{background:'transparent',border:'none',fontSize:22,cursor:'pointer',color:'#2d3748',padding:'2px 8px'}}
                        onClick={()=>{ if(!aiLoading) setAiProposals(null); }}
                        disabled={aiLoading}
                      >X</button>
                    </div>

                    {/* Body */}
                    <div style={{padding:'18px 24px',overflowY:'auto',flex:1}}>
                      {(aiRejected || []).length > 0 && (
                        <div style={{margin:'0 0 14px 0',padding:'10px 14px',background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.35)',borderRadius:8,fontSize:12}}>
                          <div style={{fontWeight:700,color:'#92400E',marginBottom:6}}>
                            {aiRejected.length} fournisseur(s) non affecte(s) :
                          </div>
                          <ul style={{margin:0,paddingLeft:18,color:'#78350F'}}>
                            {aiRejected.map((r, i) => (
                              <li key={i}><strong>{r.supplier_name || '(vide)'}</strong> - {r.reason || 'motif non precise'}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiLoading && (
                        <div style={{textAlign:'center',padding:'40px 20px',color:'#2d3748'}}>
                          <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>L'IA analyse les charges et reflechit...</div>
                          <div style={{fontSize:12}}>Cela peut prendre quelques secondes.</div>
                        </div>
                      )}
                      {!aiLoading && aiProposals.length === 0 && (
                        <div style={{textAlign:'center',padding:'40px 20px',color:'#DC2626',fontSize:13}}>
                          Aucune proposition recue.
                        </div>
                      )}
                      {!aiLoading && aiProposals.length > 0 && (
                        <div style={{overflowX:'auto'}}>
                          <table style={S.table}>
                            <thead><tr>
                              <th style={{...S.th,width:50,textAlign:'center'}}>
                                <input
                                  type="checkbox"
                                  checked={aiSelected.size === aiProposals.length}
                                  onChange={(e)=>{
                                    if (e.target.checked) {
                                      setAiSelected(new Set(aiProposals.map((_,i)=>i)));
                                    } else {
                                      setAiSelected(new Set());
                                    }
                                  }}
                                />
                              </th>
                              <th style={S.th}>Fournisseur</th>
                              <th style={S.th}>Consultant propose</th>
                              <th style={S.th}>Raison</th>
                            </tr></thead>
                            <tbody>
                              {aiProposals.map((p, i) => (
                                <tr key={i}>
                                  <td style={{...S.td,textAlign:'center'}}>
                                    <input
                                      type="checkbox"
                                      checked={aiSelected.has(i)}
                                      onChange={(e)=>{
                                        const next = new Set(aiSelected);
                                        if (e.target.checked) next.add(i); else next.delete(i);
                                        setAiSelected(next);
                                      }}
                                    />
                                  </td>
                                  <td style={{...S.td,fontWeight:600}}>{p.supplier_name}</td>
                                  <td style={S.td}>
                                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                                      <div style={{...S.avatar,width:24,height:24,fontSize:9}}>{getInitials(p.consultant_name)}</div>
                                      {p.consultant_name}
                                    </div>
                                  </td>
                                  <td style={{...S.td,fontSize:11,color:'#2d3748'}}>{p.reason}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div style={{padding:'14px 24px',borderTop:'1px solid #e2e8f0',display:'flex',gap:10,justifyContent:'flex-end'}}>
                      <button
                        style={S.btn('ghost')}
                        onClick={()=>setAiProposals(null)}
                        disabled={aiLoading}
                      >Annuler</button>
                      <button
                        style={S.btn('accent')}
                        disabled={aiLoading || aiProposals.length === 0 || aiSelected.size === 0}
                        onClick={handleAiConfirm}
                      >
                        Confirmer la selection ({aiSelected.size})
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </>;
          })()}
        </div>}
      </div>
    </div>
  );
};

// ═══ DECLARER (COS) ═══
// ═══════════════════════════════════════════════════════════════
// DECLARER VIEW — AVEC CHAMPS OBLIGATOIRES + SAUVEGARDE EXCEL
// ═══════════════════════════════════════════════════════════════
//
// INSTRUCTIONS :
// 1. Copie tout ce code
// 2. Dans ton App.jsx, SUPPRIME l'ancien composant DeclarerView (de "const DeclarerView = ..." jusqu'à son "};")
// 3. Colle ce nouveau DeclarerView à la place
// 4. Ajoute en haut de ton App.jsx :  import * as XLSX from 'xlsx';
//
// ═══════════════════════════════════════════════════════════════

// --- AJOUTE CET IMPORT EN HAUT DE App.jsx ---
// import * as XLSX from 'xlsx';

// --- REGLES DE VALIDATION PAR MICRO-TACHE ---
// condition: "ET" = tous les champs marqués true sont obligatoires
// condition: "OU" = au moins un des champs marqués true doit être rempli
// condition: null = pas de champs obligatoires (sauf seller si marqué)
const TASK_RULES = {
  // === Booking Validation ===
  "Inventory Check":           { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Pooling dock check":        { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Availability analysis":     { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Massive acceptance":        { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Validation Data summary":   { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },

  // === Follow Up ===
  "Not processed orders Follow up": { seller: true, pack: false, load: true, to: true, dn: false, xf: true, condition: "OU" },
  "Processed in delay Follow up":   { seller: true, pack: false, load: true, to: true, dn: false, xf: true, condition: "OU" },

  // === Special Orders ===
  "Special Order Creation":    { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Exchange File":             { seller: true, pack: true,  load: true,  to: true,  dn: false, xf: true, condition: "OU" },
  "GLE check":                 { seller: true, pack: false, load: true,  to: true,  dn: false, xf: true, condition: "OU" },

  // === Special Requests ===
  "NOQ Analysis / Escalation": { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Booking line analysis":     { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Urgent truck":              { seller: true, pack: true,  load: true,  to: true,  dn: false, xf: true, condition: "OU" },
  "BTAB Request check":        { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Variante fornitore":        { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Abacofor link check":       { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Client Code Link Check / Cancellation": { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },

  // === Cardboard Analysis ===
  "WR check":                  { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },
  "Case analysis":             { seller: true, pack: true,  load: true,  to: true,  dn: false, xf: true, condition: "OU" },
  "Action plan":               { seller: true, pack: true,  load: true,  to: true,  dn: false, xf: true, condition: "OU" },

  // === Inventory ===
  "Movement Analysis":         { seller: true, pack: true,  load: false, to: false, dn: true,  xf: true, condition: "OU" },
  "Movement Correction":       { seller: true, pack: true,  load: false, to: false, dn: true,  xf: true, condition: "OU" },
  "SAP inventory upload":      { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Inventory file archiving":  { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },

  // === Invoicing ===
  "Sending draft report":             { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Correction missing/wrong mvt":     { seller: true, pack: false, load: false, to: false, dn: true,  xf: true, condition: "OU" },
  "Final draft report check":         { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Credit note creation":             { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Final check invoices file":        { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },
  "Follow up of payment":             { seller: true, pack: false, load: false, to: false, dn: false, xf: true, condition: null },

  // === Recovery ===
  "Recovery":                  { seller: true, pack: true,  load: false, to: false, dn: false, xf: true, condition: "ET" },

  // === Emails ===
  "Emails level 1":            { seller: true, pack: true,  load: true,  to: true,  dn: true,  xf: true, condition: "OU" },
  "Emails level 2":            { seller: true, pack: true,  load: true,  to: true,  dn: true,  xf: true, condition: "OU" },

  // === Meetings ===
  "Meeting":                   { seller: false, pack: false, load: false, to: false, dn: false, xf: false, freeText: true, condition: null },
  "Supplier meeting":          { seller: true,  pack: false, load: false, to: false, dn: false, xf: false, freeText: true, condition: null },

  // === Difficulties ===
  "Delays on systems and files": { seller: false, pack: false, load: false, to: false, dn: false, xf: false, freeText: true, condition: null },

  // === Training / Team ===
  "Training for new comer for specific tasks": { seller: false, pack: false, load: false, to: false, dn: false, xf: false, freeText: true, condition: null },
  "Support team on daily basis":               { seller: false, pack: false, load: false, to: false, dn: false, xf: false, freeText: true, condition: null },
};

// Fonction pour trouver la règle la plus proche (matching partiel)
const getTaskRule = (taskName) => {
  // D'abord chercher un match exact
  if (TASK_RULES[taskName]) return TASK_RULES[taskName];
  // Sinon chercher un match partiel
  const key = Object.keys(TASK_RULES).find(k =>
    taskName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(taskName.toLowerCase())
  );
  return key ? TASK_RULES[key] : { seller: false, pack: false, load: false, to: false, dn: false, xf: false, freeText: false, condition: null };
};

// ═══ DECLARER (COS) — AVEC VALIDATION + EXCEL ═══
const DeclarerView = ({showToast, currentUser}) => {
  const [checked, setChecked] = useState(new Set());
  const [freqs, setFreqs] = useState({});
  const [reals, setReals] = useState({});
  const [sellers, setSellers] = useState({});
  const [packs, setPacks] = useState({});
  const [loads, setLoads] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDur, setNewTaskDur] = useState('');
  const [tos, setTos] = useState({});
  const [dns, setDns] = useState({});
  const [statuses, setStatuses] = useState({});
  const [openCats, setOpenCats] = useState(new Set([0, 1]));
  const [livrableText, setLivrableText] = useState('Selectionnez une tache');
  const [errors, setErrors] = useState({}); // { [taskIndex]: { seller: "msg", pack: "msg", ... } }
  const [globalError, setGlobalError] = useState('');
const [macroSellers, setMacroSellers] = useState({});
  const [macroPacks, setMacroPacks] = useState({});
  const [macroLoads, setMacroLoads] = useState({});
  const [macroTos, setMacroTos] = useState({});
  const [macroDns, setMacroDns] = useState({});
  const [macroFreqs, setMacroFreqs] = useState({});
  const [macroReals, setMacroReals] = useState({});
  const [macroStatuses, setMacroStatuses] = useState({});
  const [xfCodes, setXfCodes] = useState({});
const [macroXfCodes, setMacroXfCodes] = useState({});
  const [freeTexts, setFreeTexts] = useState({});
  const [macroFreeTexts, setMacroFreeTexts] = useState({});
  let idx = 0;
  const taskMap = {};
  CATEGORIES.forEach(cat => cat.tasks.forEach(t => { taskMap[idx] = t; idx++; }));

  const customStd = customTasks.reduce((a, ct) => a + (ct.dur || 0), 0);

  const totalStd = [...checked].reduce((a, i) => {
    const t = taskMap[i];
    return a + (t ? t.dur * (freqs[i] || 1) : 0);
  }, 0) + customStd;

  const totalReal = [...checked].reduce((a, i) => {
    const t = taskMap[i];
    const r = reals[i];
    return a + (r ? parseInt(r) : t ? t.dur * (freqs[i] || 1) : 0);
  }, 0) + customStd;

  const toggle = (i) => {
    const toggleCategory = (ci) => {
    const cat = CATEGORIES[ci];
    let startIdx = 0;
    for (let c = 0; c < ci; c++) startIdx += CATEGORIES[c].tasks.length;
    const catIndices = cat.tasks.map((_, ti) => startIdx + ti);

    const s = new Set(checked);
    const allChecked = catIndices.every(i => s.has(i));
    if (allChecked) {
      catIndices.forEach(i => s.delete(i));
    } else {
      catIndices.forEach(i => s.add(i));
    }
    setChecked(s);
  };
  
    const s = new Set(checked);
    if (s.has(i)) s.delete(i); else s.add(i);
    setChecked(s);
    // Effacer l'erreur quand on décoche
    if (!s.has(i)) {
      const newErrors = { ...errors };
      delete newErrors[i];
      setErrors(newErrors);
    }
    const t = taskMap[i];
    if (t) {
      setLivrableText(buildLivrable(t.name, {
        seller: sellers[i+'_0'] || sellers[i],
        xf: xfCodes[i+'_0'] || xfCodes[i],
        pack: packs[i+'_0'] || packs[i],
        load: loads[i+'_0'] || loads[i],
        to: tos[i+'_0'] || tos[i],
        dn: dns[i+'_0'] || dns[i],
      }) || t.name);
    }
  };
const toggleCategory = (ci) => {
    const cat = CATEGORIES[ci];
    let startIdx = 0;
    for (let c = 0; c < ci; c++) startIdx += CATEGORIES[c].tasks.length;
    const catIndices = cat.tasks.map((_, ti) => startIdx + ti);

    const s = new Set(checked);
    const allChecked = catIndices.every(i => s.has(i));
    if (allChecked) {
      catIndices.forEach(i => s.delete(i));
    } else {
      catIndices.forEach(i => s.add(i));
    }
    setChecked(s);
  };
  const getCatRule = (cat) => {
  let seller=false, pack=false, load=false, to=false, dn=false, xf=false, freeText=false;
  cat.tasks.forEach(t => {
    const r = getTaskRule(t.name);
    if (r.seller) seller = true;
    if (r.pack) pack = true;
    if (r.load) load = true;
    if (r.to) to = true;
    if (r.dn) dn = true;
    if (r.xf) xf = true;
    if (r.freeText) freeText = true;
  });
  return {seller, pack, load, to, dn, xf, freeText};
};

  const getCatTotalDur = (cat) => cat.tasks.reduce((a, t) => a + t.dur, 0);
  // ═══ VALIDATION ═══
const validateAll = () => {
    const newErrors = {};
    let hasError = false;

    checked.forEach(i => {
      const t = taskMap[i];
      if (!t) return;

      // Trouver la catégorie de cette tâche
      let catIdx = 0;
      let count = 0;
      for (let c = 0; c < CATEGORIES.length; c++) {
        if (i < count + CATEGORIES[c].tasks.length) { catIdx = c; break; }
        count += CATEGORIES[c].tasks.length;
      }

      // Si toute la catégorie est cochée → skip la validation micro
      const cat = CATEGORIES[catIdx];
      let startIdx = 0;
      for (let c = 0; c < catIdx; c++) startIdx += CATEGORIES[c].tasks.length;
      const catIndices = cat.tasks.map((_, ti) => startIdx + ti);
      const allCatChecked = catIndices.every(idx => checked.has(idx));
      if (allCatChecked) return; // macro mode → pas de validation micro

      const rule = getTaskRule(t.name);
      const freq = freqs[i] || 1;

      for (let occ = 0; occ < freq; occ++) {
        const key = `${i}_${occ}`;
        const taskErrors = {};

        const vals = {
  seller: (sellers[key] || '').trim(),
  pack: (packs[key] || '').trim(),
  load: (loads[key] || '').trim(),
  to: (tos[key] || '').trim(),
  dn: (dns[key] || '').trim(),
  xf: (xfCodes[key] || '').trim(),
};
const requiredFields = ['seller','pack','load','to','dn','xf'].filter(f => rule[f]);
        if (rule.condition === "ET") {
  // Les champs ET restent obligatoires entre eux (sauf xf)
  const etFields = requiredFields.filter(f => f !== 'xf');
  etFields.forEach(field => {
    if (!vals[field]) { taskErrors[field] = 'Obligatoire'; hasError = true; }
  });
  // XF est en OU : si aucun autre champ ET n'est rempli, XF peut suffire
}
        else if (rule.condition === "OU") {
          const atLeastOne = requiredFields.some(field => vals[field] !== '');
          if (!atLeastOne && requiredFields.length > 0) {
            requiredFields.forEach(field => { taskErrors[field] = 'Au moins un requis'; });
            hasError = true;
          }
        } else {
          if (rule.seller && !vals.seller) { taskErrors.seller = 'Obligatoire'; hasError = true; }
        }

        if (Object.keys(taskErrors).length > 0) newErrors[key] = taskErrors;
      }
    });

    setErrors(newErrors);
    return !hasError;
  };

  // ═══ SAUVEGARDE EXCEL ═══
  const saveToExcel = async () => {
    // Lire le fichier existant
    let wb;
    try {
      const response = await fetch('/Workload_vFinal_1.xlsx');
      const buffer = await response.arrayBuffer();
      wb = XLSX.read(buffer, { type: 'array' });
    } catch (e) {
      // Si le fichier n'existe pas, créer un nouveau workbook
      wb = XLSX.utils.book_new();
    }

    // Préparer les données à sauvegarder
    const rows = [];
    // Propager les valeurs macro vers les micro-tâches
    CATEGORIES.forEach((cat, ci) => {
      let startIdx = 0;
      for (let c = 0; c < ci; c++) startIdx += CATEGORIES[c].tasks.length;
      const catIndices = cat.tasks.map((_, ti) => startIdx + ti);
      const allCatChecked = catIndices.every(idx => checked.has(idx));

      if (allCatChecked && macroSellers[`${ci}_0`]) {
        const mFreq = macroFreqs[ci] || 1;
        catIndices.forEach(idx => {
          freqs[idx] = mFreq;
          if (macroReals[ci]) reals[idx] = macroReals[ci];
          if (macroStatuses[ci]) statuses[idx] = macroStatuses[ci];
          for (let occ = 0; occ < mFreq; occ++) {
            const mk = `${ci}_${occ}`;
            const tk = `${idx}_${occ}`;
            if (macroSellers[mk]) sellers[tk] = macroSellers[mk];
            if (macroPacks[mk]) packs[tk] = macroPacks[mk];
            if (macroLoads[mk]) loads[tk] = macroLoads[mk];
            if (macroTos[mk]) tos[tk] = macroTos[mk];
            if (macroDns[mk]) dns[tk] = macroDns[mk];
          }
        });
      }
    });
    checked.forEach(i => {
      const t = taskMap[i];
      if (!t) return;
      const freq = freqs[i] || 1;
      for (let occ = 0; occ < freq; occ++) {
        const key = `${i}_${occ}`;
        const livrable = buildLivrable(t.name, {
          seller: sellers[key],
          xf: xfCodes[key],
          pack: packs[key],
          load: loads[key],
          to: tos[key],
          dn: dns[key],
        }) || t.name;
        rows.push({
          'Date': new Date().toISOString().split('T')[0],
          'Consultant': currentUser?.name || '',
          'Categorie': CATEGORIES.find(c => c.tasks.includes(t))?.cat || '',
          'Tache': t.name,
          'Duree Standard (min)': t.dur,
          'Duree Reelle (min)': reals[i] ? parseInt(reals[i]) : t.dur,
          'Frequence': freq,
          'Occurrence': occ + 1,
          'Seller Cofor': sellers[key] || '',
          'Pack': packs[key] || '',
          'Load ID': loads[key] || '',
          'TO': tos[key] || '',
          'DN Number': dns[key] || '',
          'Status': statuses[i] || 'Ongoing',
          'XF Code': xfCodes[key] || '',
          'Note': freeTexts[key] || '',
          'Livrable': livrable,
        });
      }
    });
// Ajouter les tâches personnalisées (catégorie Autre)
    customTasks.forEach(ct => {
      rows.push({
        'Date': new Date().toISOString().split('T')[0],
        'Categorie': 'Autre',
        'Tache': ct.name,
        'Duree Standard (min)': ct.dur,
        'Duree Reelle (min)': ct.dur,
        'Frequence': 1,
        'Seller Cofor': '',
        'Pack': '',
        'Load ID': '',
        'TO': '',
        'DN Number': '',
        'Status': 'Processed',
        'Livrable': ct.name,
      });
    });
    // Créer ou ajouter à la feuille "Declarations"
    const sheetName = 'Declarations';
    let existingData = [];

    if (wb.SheetNames.includes(sheetName)) {
      const ws = wb.Sheets[sheetName];
      existingData = XLSX.utils.sheet_to_json(ws);
    }

    const allData = [...existingData, ...rows];
    const newWs = XLSX.utils.json_to_sheet(allData);

    // Largeurs de colonnes
    newWs['!cols'] = [
      { wch: 12 }, // Date
      { wch: 20 }, // Categorie
      { wch: 30 }, // Tache
      { wch: 18 }, // Duree Standard
      { wch: 18 }, // Duree Reelle
      { wch: 10 }, // Frequence
      { wch: 15 }, // Seller
      { wch: 12 }, // Pack
      { wch: 12 }, // Load
      { wch: 10 }, // TO
      { wch: 12 }, // DN
      { wch: 12 }, // Status
      { wch: 50 }, // Livrable
    ];

    if (wb.SheetNames.includes(sheetName)) {
      wb.Sheets[sheetName] = newWs;
    } else {
      XLSX.utils.book_append_sheet(wb, newWs, sheetName);
    }

   // Télécharger le fichier
    XLSX.writeFile(wb, 'Workload_vFinal_1.xlsx');

    // Sauvegarder aussi dans localStorage pour la liaison Ongoing/Historique
    const savedDecl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
    const tasksMapLocal = JSON.parse(localStorage.getItem('workload_tasks_map') || '{}');
    const rowsWithConsultant = rows.map(r => ({
      ...r,
      Consultant: currentUser?.name || 'Inconnu',
    }));
    // Push sequentiel au backend, on enrichit chaque row avec _backend_id pour PUT/DELETE futurs
    for (const row of rowsWithConsultant) {
      const taskId = tasksMapLocal[row.Tache];
      const created = await pushDeclarationToBackend(row, taskId);
      if (created && created.id) row._backend_id = created.id;
    }
    localStorage.setItem('workload_declarations', JSON.stringify([...savedDecl, ...rowsWithConsultant]));
  };

  // ═══ VALIDATION + SAUVEGARDE ═══
  const handleValider = () => {
    setGlobalError('');

    if (checked.size === 0) {
      setGlobalError('Cochez au moins une tache avant de valider.');
      showToast('Cochez au moins une tache');
      return;
    }

    const isValid = validateAll();

    if (!isValid) {
      setGlobalError('Certains champs obligatoires ne sont pas remplis. Verifiez les champs en rouge.');
      showToast('Champs obligatoires manquants !');
      // Ouvrir les catégories qui ont des erreurs
      let catIdx = 0;
      CATEGORIES.forEach((cat, ci) => {
        cat.tasks.forEach((t, ti) => {
          const globalIdx = catIdx + ti;
          if (errors[globalIdx] || checked.has(globalIdx)) {
            // Vérifier si cette tâche a une erreur après validation
          }
        });
        catIdx += cat.tasks.length;
      });
      return;
    }

    // Tout est valide → sauvegarder
    saveToExcel();
    showToast('Journee validee et sauvegardee !');
  };

  // ═══ STYLES ERREUR ═══
const inputStyle = (taskIdx, field) => {
    const hasError = errors[taskIdx]?.[field];
    // Extraire l'index de tâche depuis la clé composite "3_0" → 3
    const realIdx = typeof taskIdx === 'string' && taskIdx.includes('_') ? parseInt(taskIdx.split('_')[0]) : taskIdx;
    const rule = taskMap[realIdx] ? getTaskRule(taskMap[realIdx].name) : null;
    const isRequired = rule?.[field];

    return {
      width: field === 'seller' ? 65 : field === 'dn' ? 55 : field === 'pack' ? 50 : field === 'load' ? 50 : 45,
      fontSize: 10,
      background: hasError ? 'rgba(239,68,68,0.1)' : '#f1f5f9',
      border: hasError ? '2px solid #DC2626' : isRequired ? '1px solid rgba(0,196,240,0.3)' : '1px solid #e2e8f0',
      borderRadius: 6,
      padding: '4px 6px',
      color: '#000000',
      outline: 'none',
      transition: 'border .2s',
    };
  };

  const labelTag = (taskIdx, field) => {
    const realIdx = typeof taskIdx === 'string' && taskIdx.includes('_') ? parseInt(taskIdx.split('_')[0]) : taskIdx;
    const rule = taskMap[realIdx] ? getTaskRule(taskMap[realIdx].name) : null;
    if (!rule?.[field]) return null;
    return <span style={{color:'#DC2626',fontSize:8,fontWeight:700,position:'absolute',top:-6,right:-2}}>*</span>;
  };
  // ═══ RENDER ═══
  idx = 0;
  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>Declarer ma journee</div>
        <div style={{background:'#0070ad',color:'#fff',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:600}}>{todayStr()}</div>
      </div>
      <div style={S.content}>
        {/* Barre de charge */}
        <div style={{...S.card, marginBottom: 22, padding: '18px 22px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:10}}>
            <span>Charge standard</span>
            <span style={{color:'#0070AD',fontWeight:700,...S.mono}}>{fmtMin(totalStd)}</span>
          </div>
          <div style={S.progressTrack}><div style={S.progressFill(totalStd/480*100, totalStd>480)}/></div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
            <span style={{fontSize:11,color:'#2d3748'}}>Capacite : 8h00</span>
            <span style={{fontSize:11,fontWeight:600,color:'#D97706'}}>Reel : {fmtMin(totalReal)}</span>
          </div>
        </div>

        {/* Légende champs */}
        <div style={{...S.card, marginBottom:14, padding:'12px 18px', display:'flex', gap:16, flexWrap:'wrap', alignItems:'center'}}>
          <div style={{fontSize:11,fontWeight:600,color:'#2d3748'}}>Legende :</div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:10,height:10,borderRadius:2,border:'1px solid rgba(0,196,240,0.3)',background:'transparent'}}/>
            <span style={{fontSize:10,color:'#2d3748'}}>Champ obligatoire</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4}}>
            <div style={{width:10,height:10,borderRadius:2,border:'2px solid #DC2626',background:'rgba(239,68,68,0.1)'}}/>
            <span style={{fontSize:10,color:'#DC2626'}}>Erreur</span>
          </div>
          <div style={{fontSize:10,color:'#2d3748'}}>
            <span style={{color:'#0070AD',fontWeight:600}}>ET</span> = tous requis &nbsp;|&nbsp;
            <span style={{color:'#D97706',fontWeight:600}}>OU</span> = au moins un requis
          </div>
        </div>

        {/* Erreur globale */}
        {globalError && (
          <div style={{
            background:'rgba(239,68,68,0.1)',
            border:'1px solid rgba(239,68,68,0.4)',
            borderRadius:10,
            padding:'12px 18px',
            marginBottom:14,
            display:'flex',
            alignItems:'center',
            gap:10
          }}>
            <span style={{fontSize:18}}>⚠</span>
            <span style={{fontSize:12,color:'#DC2626',fontWeight:600}}>{globalError}</span>
          </div>
        )}

        {/* Catégories et tâches */}
        {CATEGORIES.map((cat, ci) => {
          const isOpen = openCats.has(ci);
          const catStartIdx = CATEGORIES.slice(0, ci).reduce((a, c) => a + c.tasks.length, 0);

          // Compter les erreurs dans cette catégorie
          const catErrorCount = cat.tasks.reduce((count, t, ti) => {
            const globalIdx = catStartIdx + ti;
            return count + (errors[globalIdx] ? 1 : 0);
          }, 0);
const catIndices2 = cat.tasks.map((_, ti) => catStartIdx + ti);
        const catAllChecked = catIndices2.every(i => checked.has(i));
        const catSomeChecked = !catAllChecked && catIndices2.some(i => checked.has(i));
          return (
            <div key={ci} style={{...S.card, marginBottom:14, padding:0, overflow:'hidden', border: catErrorCount > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid #e2e8f0'}}>
              {/* En-tête catégorie */}
            <div style={{padding:'14px 18px'}}>
              <div onClick={() => {
                const s = new Set(openCats);
                if (s.has(ci)) s.delete(ci); else s.add(ci);
                setOpenCats(s);
              }} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>

                {/* Checkbox macro */}
                <div onClick={(e) => { e.stopPropagation(); toggleCategory(ci); }} style={{
                  width:20,height:20,borderRadius:5,flexShrink:0,
                  border:`2px solid ${catAllChecked ? '#0070ad' : '#2d3748'}`,
                  background: catAllChecked ? '#0070ad' : catSomeChecked ? 'rgba(0,112,173,0.4)' : 'transparent',
                  display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'
                }}>
                  {catAllChecked && <span style={{color:'#fff',fontSize:10}}>✓</span>}
                  {!catAllChecked && catSomeChecked && <span style={{color:'#fff',fontSize:10}}>—</span>}
                </div>

                <div style={{width:32,height:32,borderRadius:8,background:'rgba(0,112,173,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#0070AD'}}>{cat.icon}</div>
                <div style={{fontSize:14,fontWeight:700,flex:1}}>{cat.cat}</div>
                {catErrorCount > 0 && (
                  <div style={{fontSize:10,fontWeight:700,color:'#DC2626',background:'rgba(239,68,68,0.15)',padding:'2px 8px',borderRadius:20}}>
                    {catErrorCount} erreur{catErrorCount > 1 ? 's' : ''}
                  </div>
                )}
                <div style={{fontSize:11,color:'#2d3748',background:'#f1f5f9 (255,255,255,0.06)',padding:'2px 10px',borderRadius:20}}>{cat.tasks.length}</div>
                <div style={{color:'#2d3748',fontSize:14,transform:isOpen?'rotate(90deg)':'rotate(0)',transition:'transform .2s'}}>{'>'}</div>
              </div>

              {/* ═══ CHAMPS MACRO (visible si macro cochée) ═══ */}
              {catAllChecked && (() => {
                const catRule = getCatRule(cat);
                const hasFields = catRule.seller || catRule.pack || catRule.load || catRule.to || catRule.dn || catRule.xf;
                const totalDur = getCatTotalDur(cat);

                return (
                  <div style={{marginTop:10,marginLeft:30,padding:'10px 14px',background:'rgba(0,112,173,0.08)',borderRadius:10,border:'1px solid rgba(0,112,173,0.2)'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0070AD',marginBottom:8}}>Déclaration groupée — {cat.cat}</div>

                    {/* Ligne 1 : Freq + Durée std + Durée réelle + Status */}
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:8}}>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                        <div style={{fontSize:9,color:'#2d3748',marginBottom:2}}>Fréq.</div>
                        <input
                          style={{width:40,fontSize:11,textAlign:'center',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:4,color:'#000000'}}
                          type="number" min="1" placeholder="1"
                          value={macroFreqs[ci] || ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setMacroFreqs({...macroFreqs, [ci]: parseInt(e.target.value) || 1})}
                        />
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                        <div style={{fontSize:9,color:'#2d3748',marginBottom:2}}>Std</div>
                        <div style={{fontSize:11,color:'#0070AD',background:'rgba(0,196,240,0.1)',padding:'4px 8px',borderRadius:6,fontFamily:'monospace'}}>
{fmtMin(totalDur)}                        </div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                        <div style={{fontSize:9,color:'#D97706',marginBottom:2}}>Réel (min)</div>
                        <input
                          style={{width:50,fontSize:11,textAlign:'center',background:'#f1f5f9',border:'1px solid rgba(255,215,0,0.3)',borderRadius:6,padding:4,color:'#D97706'}}
                          type="number" placeholder="min"
                          value={macroReals[ci] || ''}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setMacroReals({...macroReals, [ci]: e.target.value})}
                        />
                      </div>
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                        <div style={{fontSize:9,color:'#2d3748',marginBottom:2}}>Status</div>
                        <select
                          style={{fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:(macroStatuses[ci] || 'Ongoing') === 'Ongoing' ? '#D97706' : '#16A34A',cursor:'pointer',fontWeight:600}}
                          onClick={e => e.stopPropagation()}
                          value={macroStatuses[ci] || 'Ongoing'}
                          onChange={e => setMacroStatuses({...macroStatuses, [ci]: e.target.value})}
                        >
                            <option style={{color:'#B45309'}}>Ongoing</option>                          <option style={{color:'#15803D'}}>Processed</option>                        </select>
                      </div>
                    </div>

                    {/* Ligne 2 : Champs par occurrence */}
                    {hasFields && Array.from({length: 1}, (_, occ) => {
                      const mk = `${ci}_${occ}`;
                      return (
                        <div key={occ} style={{display:'flex',gap:6,marginBottom:4,flexWrap:'wrap',alignItems:'flex-start'}}>
  
{catRule.xf && catRule.seller && !catRule.freeText && (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end'}}>
    <div style={{fontSize:10,color:'#D97706',fontWeight:700,paddingBottom:6}}>OU</div>
  </div>
)}
                          {catRule.seller && (
                            <div style={{display:'flex',flexDirection:'column',position:'relative'}}>
                              <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>Seller <span style={{color:'#DC2626'}}>*</span></div>
                              <input style={{width:120,fontSize:10,background:'#f1f5f9',border:'1px solid rgba(0,196,240,0.3)',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                placeholder="Seller Cofor (STLA)" onClick={e => e.stopPropagation()}
                                list={`stla-macro-${mk}`}
                                value={macroSellers[mk] || ''}
                                onChange={e => setMacroSellers({...macroSellers, [mk]: e.target.value})}
                              />
                              <datalist id={`stla-macro-${mk}`}>
                                {getStlaList()
                                  .filter(s => !macroSellers[mk] || s.toLowerCase().includes((macroSellers[mk]||'').toLowerCase()))
                                  .slice(0, 30)
                                  .map((s, idx) => <option key={idx} value={s} />)}
                              </datalist>
                            </div>
                          )}
                          {catRule.pack && (
                            <div style={{display:'flex',flexDirection:'column'}}>
                              <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>Pack <span style={{color:'#DC2626'}}>*</span></div>
                              <input style={{width:50,fontSize:10,background:'#f1f5f9',border:'1px solid rgba(0,196,240,0.3)',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                placeholder="Pack" onClick={e => e.stopPropagation()}
                                value={macroPacks[mk] || ''}
                                onChange={e => setMacroPacks({...macroPacks, [mk]: e.target.value})}
                              />
                            </div>
                          )}
                          {catRule.load && (
                            <div style={{display:'flex',flexDirection:'column'}}>
                              <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>Load ID</div>
                              <input style={{width:50,fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                placeholder="Load ID" onClick={e => e.stopPropagation()}
                                value={macroLoads[mk] || ''}
                                onChange={e => setMacroLoads({...macroLoads, [mk]: e.target.value})}
                              />
                            </div>
                          )}
                          {catRule.to && (
                            <div style={{display:'flex',flexDirection:'column'}}>
                              <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>TO</div>
                              <input style={{width:45,fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                placeholder="TO" onClick={e => e.stopPropagation()}
                                value={macroTos[mk] || ''}
                                onChange={e => setMacroTos({...macroTos, [mk]: e.target.value})}
                              />
                            </div>
                          )}
                          {catRule.dn && (
                            <div style={{display:'flex',flexDirection:'column'}}>
                              <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>DN</div>
                              <input style={{width:55,fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                placeholder="DN" onClick={e => e.stopPropagation()}
                                value={macroDns[mk] || ''}
                                onChange={e => setMacroDns({...macroDns, [mk]: e.target.value})}
                              />
                            </div>
                          )}
                    
                          {catRule.xf && !catRule.freeText && (
  <div style={{display:'flex',flexDirection:'column'}}>
    <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>XF Code <span style={{color:'#D97706'}}>OU</span></div>
    <input style={{width:55,fontSize:10,background:'#f1f5f9',border:'1px solid rgba(0,196,240,0.3)',borderRadius:6,padding:'4px 6px',color:'#000000'}}
      placeholder="XF Code" onClick={e => e.stopPropagation()}
      value={macroXfCodes[mk] || ''}
      onChange={e => setMacroXfCodes({...macroXfCodes, [mk]: e.target.value})}
    />
  </div>
)}
                          {catRule.freeText && (
  <div style={{display:'flex',flexDirection:'column',flex:1,minWidth:160}}>
    <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>Note (facultatif)</div>
    <input style={{width:'100%',fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 8px',color:'#000000'}}
      placeholder="Saisie libre…" onClick={e => e.stopPropagation()}
      value={macroFreeTexts[mk] || ''}
      onChange={e => setMacroFreeTexts({...macroFreeTexts, [mk]: e.target.value})}
    />
  </div>
)}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

              {/* Tâches */}
              {isOpen && (
                <div style={{borderTop:'1px solid #e2e8f0',padding:'10px 14px'}}>
                  {cat.tasks.map((t, ti) => {
                    const i = catStartIdx + ti;
                    const isChecked = checked.has(i);
                    const rule = getTaskRule(t.name);
                    const taskErrors = errors[i] || {};
                    const hasAnyError = Object.keys(taskErrors).length > 0;

                    // Déterminer le badge condition
                    let condBadge = null;
                    if (rule.condition === 'ET') {
                      condBadge = <span style={{fontSize:9,fontWeight:700,color:'#0070AD',background:'rgba(0,196,240,0.15)',padding:'1px 6px',borderRadius:4}}>ET</span>;
                    } else if (rule.condition === 'OU') {
                      condBadge = <span style={{fontSize:9,fontWeight:700,color:'#D97706',background:'rgba(245,158,11,0.15)',padding:'1px 6px',borderRadius:4}}>OU</span>;
                    }

                    return (
                      <div key={i} style={{
                        padding:'8px 10px',
                        borderRadius:8,
                        background: hasAnyError ? 'rgba(239,68,68,0.06)' : isChecked ? 'rgba(0,112,173,0.1)' : 'transparent',
                        cursor:'pointer',
                        marginBottom:4,
                        border: hasAnyError ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
                      }}>
                        {/* Ligne 1 : checkbox + nom + freq + durée standard + durée réelle */}
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          {/* Checkbox */}
                          <div onClick={() => toggle(i)} style={{
                            width:18,height:18,borderRadius:5,
                            border:`2px solid ${isChecked ? '#0070ad' : '#2d3748'}`,
                            background: isChecked ? '#0070ad' : 'transparent',
                            display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0
                          }}>
                           {isChecked && !catAllChecked && <span style={{color:'#fff',fontSize:10}}>✓</span>}
                          </div>

                          {/* Nom tâche */}
                          <div style={{fontSize:13,fontWeight:500,flex:1,minWidth:120}} onClick={() => toggle(i)}>
                            {t.name}
                          </div>

                          {/* Badge condition */}
                          {condBadge}

                          {/* Fréquence */}
                          <input
                            style={{width:40,...S.mono,fontSize:11,textAlign:'center',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:4,color:'#000000'}}
                            placeholder="1" type="number" min="1"
                            onClick={e => e.stopPropagation()}
                            onChange={e => setFreqs({...freqs, [i]: parseInt(e.target.value) || 1})}
                          />

                          {/* Durée standard */}
                          <div style={{fontSize:11,color:'#0070AD',...S.mono,background:'rgba(0,196,240,0.1)',padding:'4px 8px',borderRadius:6}}>
                            {fmtMin(t.dur)}
                          </div>

                          {/* Durée réelle */}
                          <input
                            style={{width:40,...S.mono,fontSize:11,textAlign:'center',background:'#f1f5f9',border:'1px solid rgba(255,215,0,0.3)',borderRadius:6,padding:4,color:'#D97706'}}
                            placeholder="min" type="number"
                            onClick={e => e.stopPropagation()}
                            onChange={e => setReals({...reals, [i]: e.target.value})}
                          />

                          {/* Status */}
                          <select
                            style={{fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:(statuses[i] || 'Ongoing') === 'Ongoing' ? '#B45309' : '#15803D',cursor:'pointer',fontWeight:600}}
                            onClick={e => e.stopPropagation()}
                            onChange={e => setStatuses({...statuses, [i]: e.target.value})}
                          >
                              <option style={{color:'#B45309'}}>Ongoing</option>                            <option style={{color:'#15803D'}}>Processed</option>                          </select>
                        </div>

                       {/* Ligne 2 : Champs par occurrence (fréquence) */}
                       {isChecked && !catAllChecked && (() => {                       const hasFields = rule.seller || rule.pack || rule.load || rule.to || rule.dn;
                        if (!hasFields) return null;
                        // Si toute la catégorie est cochée → les champs macro suffisent
                        if (catAllChecked) return null;

                        // Si la macro-tâche est cochée et a des valeurs macro → pas besoin de remplir ici
if (catAllChecked) return null;
                        const freq = freqs[i] || 1;
                        return (
                          <div style={{marginTop:8,marginLeft:26}}>
                            {Array.from({length: freq}, (_, occ) => {
                              const key = `${i}_${occ}`;
                              const occErrors = errors[key] || {};
                              return (
                                <div key={occ} style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap',alignItems:'flex-start'}}>
                                  {freq > 1 && (
                                    <div style={{fontSize:9,color:'#2d3748',fontWeight:700,minWidth:18,paddingTop:18}}>#{occ+1}</div>
                                  )}
                                  {rule.xf && !rule.freeText && (
  <div style={{display:'flex',flexDirection:'column'}}>
    <div style={{fontSize:9,color:occErrors.xf ? '#DC2626' : '#D97706',marginBottom:2,fontWeight:600}}>
      XF Code
    </div>
    <input
      style={inputStyle(key, 'xf')}
      placeholder="XF Code"
      onClick={e => e.stopPropagation()}
      value={xfCodes[key] || ''}
      onChange={e => {
        setXfCodes({...xfCodes, [key]: e.target.value});
        if (errors[key]?.xf) {
          const ne = {...errors};
          delete ne[key].xf;
          if (Object.keys(ne[key]||{}).length===0) delete ne[key];
          setErrors(ne);
        }
      }}
    />
    {occErrors.xf && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.xf}</span>}
  </div>
)}
{rule.freeText && (
  <div style={{display:'flex',flexDirection:'column',flex:1,minWidth:160}}>
    <div style={{fontSize:9,color:'#2d3748',marginBottom:2,fontWeight:600}}>Note (facultatif)</div>
    <input
      style={{width:'100%',fontSize:10,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 8px',color:'#000000'}}
      placeholder="Saisie libre…"
      onClick={e => e.stopPropagation()}
      value={freeTexts[key] || ''}
      onChange={e => setFreeTexts({...freeTexts, [key]: e.target.value})}
    />
  </div>
)}
{rule.xf && rule.seller && !rule.freeText && (
  <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end'}}>
    <div style={{fontSize:10,color:'#D97706',fontWeight:700,paddingBottom:6}}>OU</div>
  </div>
)}
                                  {rule.seller && (
                                    <div style={{display:'flex',flexDirection:'column',position:'relative'}}>
                                      <div style={{fontSize:9,color:occErrors.seller ? '#DC2626' : '#2d3748',marginBottom:2,fontWeight:600}}>
                                        Seller <span style={{color:'#DC2626'}}>*</span>
                                      </div>
                                      <input
                                        style={{...inputStyle(key, 'seller'), width:120}}
                                        placeholder="Seller Cofor (STLA)"
                                        list={`stla-micro-${key}`}
                                        onClick={e => e.stopPropagation()}
                                        value={sellers[key] || ''}
                                        onChange={e => {
                                          setSellers({...sellers, [key]: e.target.value});
                                          if (errors[key]?.seller) {
                                            const ne = {...errors};
                                            delete ne[key].seller;
                                            if (Object.keys(ne[key]||{}).length===0) delete ne[key];
                                            setErrors(ne);
                                          }
                                        }}
                                      />
                                      <datalist id={`stla-micro-${key}`}>
                                        {getStlaList()
                                          .filter(s => !sellers[key] || s.toLowerCase().includes((sellers[key]||'').toLowerCase()))
                                          .slice(0, 30)
                                          .map((s, idx) => <option key={idx} value={s} />)}
                                      </datalist>
                                      {occErrors.seller && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.seller}</span>}
                                    </div>
                                  )}
                                  {rule.pack && (
                                    <div style={{display:'flex',flexDirection:'column'}}>
                                      <div style={{fontSize:9,color:occErrors.pack ? '#DC2626' : '#2d3748',marginBottom:2,fontWeight:600}}>
                                        Pack {rule.condition && <span style={{color:'#DC2626'}}>*</span>}
                                      </div>
                                      <input
                                        style={inputStyle(key, 'pack')}
                                        placeholder="Pack"
                                        onClick={e => e.stopPropagation()}
                                        value={packs[key] || ''}
                                        onChange={e => {
                                          setPacks({...packs, [key]: e.target.value});
                                          if (errors[key]?.pack) {
                                            const ne = {...errors};
                                            delete ne[key].pack;
                                            if (Object.keys(ne[key]||{}).length===0) delete ne[key];
                                            setErrors(ne);
                                          }
                                        }}
                                      />
                                      {occErrors.pack && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.pack}</span>}
                                    </div>
                                  )}
                                  {rule.load && (
                                    <div style={{display:'flex',flexDirection:'column'}}>
                                      <div style={{fontSize:9,color:occErrors.load ? '#DC2626' : '#2d3748',marginBottom:2,fontWeight:600}}>
                                        Load ID {rule.condition && <span style={{color:'#DC2626'}}>*</span>}
                                      </div>
                                      <input
                                        style={inputStyle(key, 'load')}
                                        placeholder="Load ID"
                                        onClick={e => e.stopPropagation()}
                                        value={loads[key] || ''}
                                        onChange={e => {
                                          setLoads({...loads, [key]: e.target.value});
                                          if (errors[key]?.load) {
                                            const ne = {...errors};
                                            delete ne[key].load;
                                            if (Object.keys(ne[key]||{}).length===0) delete ne[key];
                                            setErrors(ne);
                                          }
                                        }}
                                      />
                                      {occErrors.load && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.load}</span>}
                                    </div>
                                  )}
                                  {rule.to && (
                                    <div style={{display:'flex',flexDirection:'column'}}>
                                      <div style={{fontSize:9,color:occErrors.to ? '#DC2626' : '#2d3748',marginBottom:2,fontWeight:600}}>
                                        TO {rule.condition && <span style={{color:'#DC2626'}}>*</span>}
                                      </div>
                                      <input
                                        style={inputStyle(key, 'to')}
                                        placeholder="TO"
                                        onClick={e => e.stopPropagation()}
                                        value={tos[key] || ''}
                                        onChange={e => {
                                          setTos({...tos, [key]: e.target.value});
                                          if (errors[key]?.to) {
                                            const ne = {...errors};
                                            delete ne[key].to;
                                            if (Object.keys(ne[key]||{}).length===0) delete ne[key];
                                            setErrors(ne);
                                          }
                                        }}
                                      />
                                      {occErrors.to && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.to}</span>}
                                    </div>
                                  )}
                                  {rule.dn && (
                                    <div style={{display:'flex',flexDirection:'column'}}>
                                      <div style={{fontSize:9,color:occErrors.dn ? '#DC2626' : '#2d3748',marginBottom:2,fontWeight:600}}>
                                        DN {rule.condition && <span style={{color:'#DC2626'}}>*</span>}
                                      </div>
                                      <input
                                        style={inputStyle(key, 'dn')}
                                        placeholder="DN Number"
                                        onClick={e => e.stopPropagation()}
                                        value={dns[key] || ''}
                                        onChange={e => {
                                          setDns({...dns, [key]: e.target.value});
                                          if (errors[key]?.dn) {
                                            const ne = {...errors};
                                            delete ne[key].dn;
                                            if (Object.keys(ne[key]||{}).length===0) delete ne[key];
                                            setErrors(ne);
                                          }
                                        }}
                                      />
                                      {occErrors.dn && <span style={{fontSize:9,color:'#DC2626',marginTop:1}}>{occErrors.dn}</span>}
                                    </div>
                                  )}
                              

                                  {!rule.seller && (
                                    <div style={{display:'flex',flexDirection:'column'}}>
                                      <div style={{fontSize:9,color:'#555',marginBottom:2}}>Seller</div>
                                      <input
                                        style={{width:65,fontSize:10,background:'#f9fafb',border:'1px solid rgba(255,255,255,0.05)',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                                        placeholder="Seller" onClick={e => e.stopPropagation()}
                                        value={sellers[key] || ''} onChange={e => setSellers({...sellers, [key]: e.target.value})}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
{/* Catégorie Autre */}
<div style={{...S.card, marginTop:14, padding:0, overflow:'hidden'}}>
  <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'rgba(255,215,0,0.08)',cursor:'pointer'}}>
    <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#ffd700,#D97706)',color:'#0a192f',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800}}>+</div>
    <div style={{fontSize:14,fontWeight:600}}>Autre</div>
    <div style={{fontSize:11,color:'#2d3748',marginLeft:'auto'}}>{customTasks.length} tâche(s)</div>
  </div>
  <div style={{padding:'10px 16px'}}>
    {customTasks.map((ct, idx) => (
      <div key={idx} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'rgba(255,215,0,0.06)',marginBottom:4}}>
        <span style={{fontSize:13,flex:1}}>{ct.name}</span>
        <div style={{fontSize:11,color:'#D97706',background:'rgba(255,215,0,0.1)',padding:'4px 8px',borderRadius:6}}>{fmtMin(ct.dur)}</div>
        <div style={{cursor:'pointer',color:'#DC2626',fontSize:14,padding:'2px 6px'}} onClick={() => setCustomTasks(customTasks.filter((_,i) => i !== idx))}>✕</div>
      </div>
    ))}
    <div style={{display:'flex',gap:8,marginTop:8,alignItems:'center'}}>
      <input
        style={{flex:1,fontSize:12,background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:6,padding:'6px 10px',color:'#000000'}}
        placeholder="Nom de la tâche"
        value={newTaskName}
        onChange={e => setNewTaskName(e.target.value)}
      />
      <input
        style={{width:60,fontSize:12,background:'#f1f5f9',border:'1px solid rgba(255,215,0,0.3)',borderRadius:6,padding:'6px 10px',color:'#D97706',textAlign:'center'}}
        placeholder="min"
        type="number"
        value={newTaskDur}
        onChange={e => setNewTaskDur(e.target.value)}
      />
      <button style={{...S.btn('accent'),padding:'6px 14px',fontSize:12}} onClick={() => {
        if (!newTaskName.trim() || !newTaskDur) return;
        setCustomTasks([...customTasks, {name: newTaskName.trim(), dur: parseInt(newTaskDur) || 0}]);
        setNewTaskName('');
        setNewTaskDur('');
      }}>+ Ajouter</button>
    </div>
  </div>
</div>
        {/* Typologie livrable - aperçu de toutes les tâches cochées */}
        <div style={{...S.card, padding:'14px 18px', marginTop:14}}>
          <div style={{fontSize:12,fontWeight:600,color:'#0070AD',marginBottom:6}}>Typologie livrable :</div>
          {checked.size === 0 ? (
            <div style={{fontSize:11,color:'#2d3748',...S.mono}}>Selectionnez une tache</div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {[...checked].map(i => {
                const t = taskMap[i];
                if (!t) return null;
                const freq = freqs[i] || 1;
                const previews = [];
                for (let occ = 0; occ < freq; occ++) {
                  const key = `${i}_${occ}`;
                  previews.push(buildLivrable(t.name, {
                    seller: sellers[key],
                    xf: xfCodes[key],
                    pack: packs[key],
                    load: loads[key],
                    to: tos[key],
                    dn: dns[key],
                  }) || t.name);
                }
                return previews.map((lv, k) => (
                  <div key={`${i}_${k}`} style={{fontSize:11,color:'#2d3748',...S.mono,wordBreak:'break-all'}}>{lv}</div>
                ));
              })}
            </div>
          )}
        </div>

        {/* Barre de validation */}
        <div style={{...S.card, marginTop:18, padding:'18px 22px', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:13,color:'#2d3748'}}>
              Std: <span style={{color:'#0070AD'}}>{fmtMin(totalStd)}</span> · Reel: <span style={{color:'#D97706'}}>{fmtMin(totalReal)}</span>
            </div>
            <div style={{fontSize:24,fontWeight:700,color:'#0070AD',...S.mono}}>{fmtMin(totalReal || totalStd)}</div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button style={S.btn('ghost')} onClick={() => {
              setChecked(new Set());
              setFreqs({});
              setReals({});
              setSellers({});
              setPacks({});
              setLoads({});
              setTos({});
              setDns({});
              setStatuses({});
              setErrors({});
              setGlobalError('');
              setXfCodes({});
              setMacroXfCodes({});
              setFreeTexts({});
              setMacroFreeTexts({});
              setMacroSellers({});
              setMacroPacks({});
              setMacroLoads({});
              setMacroTos({});
              setMacroDns({});
              setMacroFreqs({});
              setMacroReals({});
              setMacroStatuses({});
            }}>Reinitialiser</button>
            <button style={S.btn('accent')} onClick={handleValider}>
              Valider & Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// ═══ MON WORKLOAD (COS) ═══
const MonWorkload = ({currentUser}) => {
  const [decl, setDecl] = useState([]);

  useEffect(() => {
    const load = () => {
      const saved = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
      const my = currentUser ? saved.filter(d => d.Consultant === currentUser.name) : saved;
      setDecl(my);
    };
    load();
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // KPIs réels
  const totalStd = decl.reduce((a, d) => a + (d['Duree Standard (min)'] || 0), 0);
  const totalReel = decl.reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0), 0);
  const ongoing = decl.filter(d => d.Status === 'Ongoing').length;
  const processed = decl.filter(d => d.Status === 'Processed').length;
  const totalTasks = decl.length;

  // Charge par jour
  const byDate = {};
  decl.forEach(d => {
    const dt = d.Date;
    if (!dt) return;
    if (!byDate[dt]) byDate[dt] = { std: 0, reel: 0, tasks: 0 };
    byDate[dt].std += d['Duree Standard (min)'] || 0;
    byDate[dt].reel += d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0;
    byDate[dt].tasks += 1;
  });
  const dates = Object.keys(byDate).sort();
  const nbDays = dates.length;
  const moyJour = nbDays > 0 ? Math.round(totalReel / nbDays) : 0;

  // Tendance
  const tendData = dates.slice(-10).map(dt => ({
    name: dt.substring(5),
    charge: byDate[dt].reel || byDate[dt].std,
    obj: 480,
  }));

  // Tâche la plus fréquente
  const taskFreq = {};
  decl.forEach(d => {
    const t = d.Tache || '';
    if (!taskFreq[t]) taskFreq[t] = 0;
    taskFreq[t]++;
  });
  const topTasks = Object.entries(taskFreq).sort((a, b) => b[1] - a[1]);
  const topTaskName = topTasks.length > 0 ? topTasks[0][0] : '-';

  // Par catégorie
  const byCat = {};
  decl.forEach(d => {
    const cat = d.Categorie || 'Autre';
    if (!byCat[cat]) byCat[cat] = 0;
    byCat[cat] += d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || d['Duree Standard (min)'] || 0;
  });
  const catData = Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([name, val]) => ({ name: name.substring(0, 12), val }));

  // Semaine courante
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const weekDecl = decl.filter(d => d.Date >= weekStartStr && d.Date <= weekEndStr);
  const weekReel = weekDecl.reduce((a, d) => a + (d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || 0), 0);
  const weekDays = [...new Set(weekDecl.map(d => d.Date))].length;

  // Efficacité
  const efficiency = totalStd > 0 ? Math.round(totalStd / (totalReel || 1) * 100) : 100;

  // Suggestion IA basée sur les données
  const generateSuggestions = () => {
    if (totalTasks === 0) return [];
    const suggestions = [];

    // Top 5 tâches par fréquence
    const orderedTasks = topTasks.slice(0, 5).map(([name]) => name);
    if (orderedTasks.length > 0) {
      suggestions.push({ type: 'order', title: 'Ordonnancement suggere', desc: 'Base sur vos taches les plus frequentes', tasks: orderedTasks });
    }

    // Alerte surcharge
    if (moyJour > 480) {
      suggestions.push({ type: 'alert', title: 'Surcharge detectee', desc: `Votre moyenne journaliere est de ${fmtMin(moyJour)}, superieure a 8h. Pensez a redistribuer certaines taches.` });
    }

    // Ongoing trop nombreux
    if (ongoing > 5) {
      suggestions.push({ type: 'alert', title: 'Taches en attente', desc: `Vous avez ${ongoing} taches ongoing. Essayez de cloturer les plus anciennes.` });
    }

    // Tâche dominante
    if (topTasks.length > 0 && topTasks[0][1] > totalTasks * 0.3) {
      suggestions.push({ type: 'info', title: 'Tache dominante', desc: `"${topTasks[0][0]}" represente ${Math.round(topTasks[0][1] / totalTasks * 100)}% de vos taches. Verifiez si c'est normal.` });
    }

    // Efficacité
    if (efficiency < 80) {
      suggestions.push({ type: 'alert', title: 'Efficacite faible', desc: `Votre efficacite est de ${efficiency}%. L'ecart entre standard et reel est important.` });
    } else if (efficiency >= 95) {
      suggestions.push({ type: 'success', title: 'Excellente efficacite', desc: `Vous etes a ${efficiency}% d'efficacite. Continuez ainsi !` });
    }

    return suggestions;
  };

  const suggestions = generateSuggestions();

  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>Mon Workload Personnel</div>
        <div style={S.topDesc}>{currentUser?.name}</div>
      </div>
      <div style={S.content}>

        {/* Pas de données */}
        {totalTasks === 0 ? (
          <div>
            <div style={{...S.grid(4), marginBottom:22}}>
              {[{t:'Charge semaine',v:'--'},{t:'Taches validees',v:'0 / 0'},{t:'Tache frequente',v:'--'},{t:'Moyenne/jour',v:'--'}].map((c,i)=>
                <div key={i} style={S.card}><div style={S.cardTitle}>{c.t}</div><div style={{...S.cardValue,fontSize:c.t==='Tache frequente'?15:28,...S.mono,color:'#2d3748'}}>{c.v}</div></div>
              )}
            </div>

            <div style={{...S.aiCard, textAlign:'center', padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>📋</div>
              <div style={{fontSize:18,fontWeight:700,color:'#2d3748',marginBottom:8}}>Aucune donnee disponible</div>
              <div style={{fontSize:13,color:'#2d3748',marginBottom:16}}>Commencez par declarer votre journee pour voir vos KPIs, tendances et suggestions IA personnalisees.</div>
              <div style={{fontSize:12,color:'#0070AD'}}>Allez dans "Declarer ma journee" pour commencer</div>
            </div>

            <div style={{marginTop:22}}>
              <SectionTitle>Suggestion IA</SectionTitle>
              <div style={{...S.card, padding:30, textAlign:'center'}}>
                <div style={{fontSize:28,marginBottom:8}}>🤖</div>
                <div style={{fontSize:14,fontWeight:600,color:'#2d3748'}}>Les suggestions apparaitront apres vos premieres declarations</div>
                <div style={{fontSize:11,color:'#444',marginTop:6}}>L'IA analysera vos habitudes pour vous proposer un ordonnancement optimal</div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* KPIs */}
            <div style={{...S.grid(4), marginBottom:22}}>
              <div style={S.card}>
                <div style={S.cardTitle}>Charge semaine</div>
                <div style={{...S.cardValue,...S.mono,color:weekReel>2400?'#DC2626':'#00c4f0'}}>{fmtMin(weekReel)}</div>
                <div style={S.cardSub}>{weekDays} jour(s) cette semaine</div>
              </div>
              <div style={S.card}>
                <div style={S.cardTitle}>Taches validees</div>
                <div style={S.cardValue}>{processed} / {totalTasks}</div>
                <div style={S.cardSub}>{ongoing} en cours</div>
              </div>
              <div style={S.card}>
                <div style={S.cardTitle}>Tache frequente</div>
                <div style={{...S.cardValue,fontSize:topTaskName.length > 15 ? 12 : 15}}>{topTaskName}</div>
                <div style={S.cardSub}>{topTasks[0]?.[1] || 0} fois</div>
              </div>
              <div style={S.card}>
                <div style={S.cardTitle}>Moyenne/jour</div>
                <div style={{...S.cardValue,...S.mono,color:moyJour>480?'#DC2626':moyJour>420?'#D97706':'#16A34A'}}>{fmtMin(moyJour)}</div>
                <div style={S.cardSub}>sur {nbDays} jours</div>
              </div>
            </div>

            {/* Barre efficacité */}
            <div style={{...S.card, marginBottom:22, padding:'16px 20px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:600}}>Efficacite globale</span>
                <span style={{fontSize:14,fontWeight:700,color:efficiency>=95?'#16A34A':efficiency>=80?'#D97706':'#DC2626'}}>{efficiency}%</span>
              </div>
              <div style={{...S.progressTrack,height:10}}>
                <div style={{height:10,borderRadius:99,width:`${Math.min(100,efficiency)}%`,background:efficiency>=95?'linear-gradient(90deg,#16A34A,#4ade80)':efficiency>=80?'linear-gradient(90deg,#D97706,#ffd700)':'linear-gradient(90deg,#DC2626,#D97706)',transition:'width .4s'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:11,color:'#2d3748'}}>
                <span>Std: <span style={{color:'#0070AD',fontWeight:600}}>{fmtMin(totalStd)}</span></span>
                <span>Reel: <span style={{color:'#D97706',fontWeight:600}}>{fmtMin(totalReel)}</span></span>
                <span>Ecart: <span style={{color:totalReel-totalStd>0?'#DC2626':'#16A34A',fontWeight:600}}>{totalReel-totalStd>0?'+':''}{fmtMin(totalReel-totalStd)}</span></span>
              </div>
            </div>

            {/* Tendance */}
            {tendData.length > 0 && <>
              <SectionTitle>Tendance journaliere</SectionTitle>
              <div style={S.chartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={tendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:11}}/>
                    <YAxis tick={{fill:'#2d3748',fontSize:11}} tickFormatter={v=>fmtMin(v)}/>
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                    <Line type="monotone" dataKey="charge" stroke="#00c4f0" name="Charge" strokeWidth={2} dot={{fill:'#00c4f0',r:4}}/>
                    <Line type="monotone" dataKey="obj" stroke="#16A34A" strokeDasharray="5 5" name="Objectif 8h" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>}

            {/* Répartition par catégorie */}
            {catData.length > 0 && <>
              <SectionTitle>Repartition par categorie</SectionTitle>
              <div style={S.chartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={catData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                    <XAxis type="number" tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                    <YAxis type="category" dataKey="name" tick={{fill:'#2d3748',fontSize:10}} width={100}/>
                    <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                    <Bar dataKey="val" fill="#0070ad" name="Temps" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>}

            {/* Suggestions IA */}
            <SectionTitle>Suggestions IA</SectionTitle>
            {suggestions.length === 0 ? (
              <div style={{...S.card, padding:20, textAlign:'center', color:'#2d3748'}}>
                Continuez a declarer pour obtenir des suggestions plus precises.
              </div>
            ) : (
              suggestions.map((s, i) => (
                <div key={i} style={{
                  ...S.aiCard,
                  background: s.type === 'alert'
                    ? 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(239,68,68,0.04))'
                    : s.type === 'success'
                    ? 'linear-gradient(135deg,rgba(34,197,94,0.12),rgba(34,197,94,0.04))'
                    : S.aiCard.background,
                  border: s.type === 'alert'
                    ? '1px solid rgba(239,68,68,0.3)'
                    : s.type === 'success'
                    ? '1px solid rgba(34,197,94,0.3)'
                    : S.aiCard.border,
                  marginBottom: 12,
                }}>
                  <div style={{
                    ...S.aiBadge,
                    background: s.type === 'alert' ? '#DC2626' : s.type === 'success' ? '#16A34A' : '#00c4f0',
                  }}>
                    {s.type === 'alert' ? '⚠ Alerte' : s.type === 'success' ? '✓ Bravo' : s.type === 'order' ? 'Ordonnancement' : 'Info'}
                  </div>
                  <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{s.title}</div>
                  <div style={{fontSize:12,color:'#2d3748'}}>{s.desc}</div>

                  {s.tasks && (
                    <div style={{marginTop:10}}>
                      {s.tasks.map((t, ti) => (
                        <div key={ti} style={{display:'flex',alignItems:'center',gap:10,...S.card,padding:'8px 14px',marginBottom:4}}>
                          <div style={{width:24,height:24,borderRadius:'50%',background:'#0070ad',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{ti+1}</div>
                          <div style={{fontSize:12,flex:1}}>{t}</div>
                          <div style={{fontSize:10,color:'#2d3748'}}>{taskFreq[t] || 0}x</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Top tâches */}
            {topTasks.length > 0 && <>
              <SectionTitle>Top taches ({topTasks.length})</SectionTitle>
              <table style={S.table}>
                <thead><tr>{['#','Tache','Frequence','% du total'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {topTasks.slice(0, 10).map(([name, count], i) => (
                    <tr key={i}>
                      <td style={S.td}>{i+1}</td>
                      <td style={{...S.td,fontWeight:600}}>{name}</td>
                      <td style={{...S.td,color:'#0070AD'}}>{count}x</td>
                      <td style={S.td}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,...S.progressTrack,height:6}}>
                            <div style={{height:6,borderRadius:99,width:`${Math.round(count/totalTasks*100)}%`,background:'#0070ad'}}/>
                          </div>
                          <span style={{fontSize:11,color:'#2d3748',minWidth:30}}>{Math.round(count/totalTasks*100)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══ PREVISIONS (COS) ═══
const PrevisionsView = ({showToast, currentUser}) => {
  const [year,setYear] = useState(2026);
  const [month,setMonth] = useState(3);
  const [selectedDays,setSelectedDays] = useState(new Set());
  const [prevData,setPrevData] = useState(() => JSON.parse(localStorage.getItem('workload_previsions_' + (currentUser?.email || '')) || '{}'));
  const [selTask,setSelTask] = useState('');
  const [freq,setFreq] = useState(1);
  const [dayOffDays, setDayOffDays] = useState(() => JSON.parse(localStorage.getItem('workload_dayoffs_' + (currentUser?.email || '')) || '[]'));
const [dayNotes, setDayNotes] = useState(() => JSON.parse(localStorage.getItem('workload_daynotes_' + (currentUser?.email || '')) || '{}'));
const [noteInput, setNoteInput] = useState('');
const [dayOffType, setDayOffType] = useState('Conge');


  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('workload_previsions_' + (currentUser?.email || ''), JSON.stringify(prevData));
  }, [prevData, currentUser]);
  useEffect(() => {
  localStorage.setItem('workload_dayoffs_' + (currentUser?.email || ''), JSON.stringify(dayOffDays));
}, [dayOffDays, currentUser]);

useEffect(() => {
  localStorage.setItem('workload_daynotes_' + (currentUser?.email || ''), JSON.stringify(dayNotes));
}, [dayNotes, currentUser]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const allTasks = [];
  CATEGORIES.forEach(c => c.tasks.forEach(t => allTasks.push(t)));

  // Clés des jours sélectionnés
  const selectedKeys = [...selectedDays].map(d => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);

  // Tâches combinées des jours sélectionnés
  const combinedTasks = [];
  selectedKeys.forEach(key => {
    (prevData[key] || []).forEach(t => combinedTasks.push({ ...t, date: key }));
  });

  // Stats du mois
  let totalMin = 0, totalDays = 0;
  Object.keys(prevData).forEach(k => {
    if (k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`) && prevData[k].length) {
      totalDays++;
      prevData[k].forEach(t => {
        const f = allTasks.find(at => at.name === t.task);
        if (f) totalMin += f.dur * t.freq;
      });
    }
  });

  // Charge par jour pour la heatmap
  const chargeParJour = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let charge = 0;
    (prevData[dk] || []).forEach(t => {
      const f = allTasks.find(at => at.name === t.task);
      if (f) charge += f.dur * t.freq;
    });
    chargeParJour[d] = charge;
  }

  // Données déclarations réelles depuis localStorage
  const decl = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
  const myDecl = currentUser ? decl.filter(d => d.Consultant === currentUser.name) : decl;
  const realChargeByDate = {};
  myDecl.forEach(d => {
    if (!d.Date) return;
    if (!realChargeByDate[d.Date]) realChargeByDate[d.Date] = 0;
    realChargeByDate[d.Date] += d['Duree Consacree (min)'] || d['Duree Reelle (min)'] || d['Duree Standard (min)'] || 0;
  });

  // Graphe prévision vs réel
  const graphData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const prev = chargeParJour[d] || 0;
    const reel = realChargeByDate[dk] || 0;
    if (prev > 0 || reel > 0) {
      graphData.push({ name: String(d), prev, reel, obj: 480 });
    }
  }

  // Gestion sélection multiple
  const handleDayClick = (d, e) => {
    const newSet = new Set(selectedDays);
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + clic → toggle ce jour
      if (newSet.has(d)) newSet.delete(d);
      else newSet.add(d);
    } else if (e.shiftKey && selectedDays.size > 0) {
      // Shift + clic → sélection de plage
      const existing = [...selectedDays].sort((a,b) => a-b);
      const min = Math.min(existing[0], d);
      const max = Math.max(existing[existing.length-1], d);
      for (let i = min; i <= max; i++) newSet.add(i);
    } else {
      // Clic simple → sélection unique
      newSet.clear();
      newSet.add(d);
    }
    setSelectedDays(newSet);
  };

  // Ajouter tâche aux jours sélectionnés
  const handleAddTask = () => {
    if (!selTask) { showToast('Choisissez une tache'); return; }
    if (selectedDays.size === 0) { showToast('Selectionnez au moins un jour'); return; }
    const newData = { ...prevData };
    selectedKeys.forEach(key => {
      if (!newData[key]) newData[key] = [];
      newData[key] = [...newData[key], { task: selTask, freq }];
    });
    setPrevData(newData);
    showToast(`Ajoutee a ${selectedDays.size} jour(s) !`);
  };

  // Supprimer une tâche
  const handleRemoveTask = (dateKey, taskIdx) => {
    const newData = { ...prevData };
    newData[dateKey] = newData[dateKey].filter((_, i) => i !== taskIdx);
    if (newData[dateKey].length === 0) delete newData[dateKey];
    setPrevData(newData);
    showToast('Tache supprimee');
  };

  // Vider les jours sélectionnés
  const handleClearSelected = () => {
    const newData = { ...prevData };
    selectedKeys.forEach(key => delete newData[key]);
    setPrevData(newData);
    showToast('Jours vides !');
  };

  // Copier les tâches d'un jour vers les autres sélectionnés
  const handleCopyToSelected = () => {
    if (selectedDays.size < 2) { showToast('Selectionnez au moins 2 jours'); return; }
    const sorted = [...selectedDays].sort((a,b) => a-b);
    const sourceKey = `${year}-${String(month+1).padStart(2,'0')}-${String(sorted[0]).padStart(2,'0')}`;
    const sourceTasks = prevData[sourceKey] || [];
    if (sourceTasks.length === 0) { showToast('Le premier jour selectionne est vide'); return; }
    const newData = { ...prevData };
    sorted.slice(1).forEach(d => {
      const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      newData[dk] = [...sourceTasks];
    });
    setPrevData(newData);
    showToast(`Copie vers ${sorted.length - 1} jour(s) !`);
  };

  // Couleur heatmap
  const getHeatColor = (charge) => {
    if (charge === 0) return 'transparent';
    if (charge > 480) return 'rgba(239,68,68,0.3)';
    if (charge > 360) return 'rgba(245,158,11,0.2)';
    if (charge > 0) return 'rgba(0,196,240,0.15)';
    return 'transparent';
  };

  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>Previsions</div>
        <div style={{fontSize:11,color:'#2d3748',background:'rgba(0,196,240,0.08)',padding:'4px 12px',borderRadius:20}}>
          Ctrl+Clic = multi-selection · Shift+Clic = plage
        </div>
      </div>
      <div style={S.content}>

        {/* Navigation mois */}
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <div style={{...S.btn('ghost'),cursor:'pointer'}} onClick={()=>{let m=month-1,y=year;if(m<0){m=11;y--;}setMonth(m);setYear(y);setSelectedDays(new Set());}}>{'<'}</div>
          <div style={{fontSize:16,fontWeight:700,minWidth:180,textAlign:'center'}}>{MONTHS[month]} {year}</div>
          <div style={{...S.btn('ghost'),cursor:'pointer'}} onClick={()=>{let m=month+1,y=year;if(m>11){m=0;y++;}setMonth(m);setYear(y);setSelectedDays(new Set());}}>{'>'}</div>
          <div style={{marginLeft:'auto',display:'flex',gap:6}}>
            <span style={{fontSize:11,color:'#0070AD',background:'rgba(0,196,240,0.1)',padding:'4px 10px',borderRadius:20}}>
              {selectedDays.size} jour(s) selectionne(s)
            </span>
          </div>
        </div>

        {/* Calendrier */}
        <div style={{...S.card, padding:16, marginBottom:18}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4}}>
            {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d,i)=><div key={i} style={{fontSize:10,fontWeight:600,color:'#2d3748',textAlign:'center',padding:6}}>{d}</div>)}
            {Array(firstDay).fill(null).map((_,i)=><div key={'e'+i}/>)}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
  const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const hasTask = prevData[dk]?.length > 0;
  const isSelected = selectedDays.has(d);
  const charge = chargeParJour[d] || 0;
  const realCharge = realChargeByDate[dk] || 0;
  const isWeekend = ((firstDay + d - 1) % 7) >= 5;
  const isDayOff = dayOffDays.some(dd => dd.date === dk);
  const dayOffInfo = dayOffDays.find(dd => dd.date === dk);
  const dayNote = dayNotes[dk] || '';

              return (
                <div key={d} onClick={(e) => handleDayClick(d, e)} style={{
                  textAlign:'center',
                  padding:'6px 4px',
                  borderRadius:10,
                  fontSize:12,
                  cursor:'pointer',
                  border: isSelected ? '2px solid #00c4f0' : '1px solid rgba(255,255,255,0.05)',
                  background: isSelected ? 'rgba(0,196,240,0.2)' : getHeatColor(charge),
                  color: isWeekend ? '#2d3748' : isSelected ? '#fff' : hasTask ? '#000000' : '#2d3748',
                  fontWeight: isSelected ? 700 : hasTask ? 600 : 400,
                  transition: 'all .15s',
                  position: 'relative',
                  minHeight: 52,
                }}>
                  <div>{d}</div>
  {isDayOff && <div style={{fontSize:7,color:'#DC2626',fontWeight:700}}>{dayOffInfo?.type || 'OFF'}</div>}
  {dayNote && !isDayOff && <div style={{fontSize:6,color:'#a855f7',marginTop:1}}>📝</div>}
                  {charge > 0 && (
                    <div style={{fontSize:8,fontWeight:700,color:charge>480?'#DC2626':charge>360?'#D97706':'#00c4f0',marginTop:2,...S.mono}}>
                      {fmtMin(charge)}
                    </div>
                  )}
                  {realCharge > 0 && (
                    <div style={{fontSize:7,color:'#D97706',marginTop:1}}>R:{fmtMin(realCharge)}</div>
                  )}
                  {hasTask && (
                    <div style={{display:'flex',justifyContent:'center',gap:2,marginTop:2}}>
                      {(prevData[dk] || []).slice(0,3).map((_,ti) => (
                        <div key={ti} style={{width:4,height:4,borderRadius:'50%',background:'#00c4f0'}}/>
                      ))}
                      {(prevData[dk]?.length || 0) > 3 && <div style={{fontSize:7,color:'#2d3748'}}>+{prevData[dk].length - 3}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Légende */}
          <div style={{display:'flex',gap:14,marginTop:12,justifyContent:'center',flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,borderRadius:3,background:'rgba(0,196,240,0.15)'}}/><span style={{fontSize:10,color:'#2d3748'}}>{'<'}6h</span></div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,borderRadius:3,background:'rgba(245,158,11,0.2)'}}/><span style={{fontSize:10,color:'#2d3748'}}>6h-8h</span></div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,borderRadius:3,background:'rgba(239,68,68,0.3)'}}/><span style={{fontSize:10,color:'#2d3748'}}>{'>'}8h</span></div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:12,height:12,borderRadius:3,border:'2px solid #00c4f0'}}/><span style={{fontSize:10,color:'#2d3748'}}>Selectionne</span></div>
            <div style={{display:'flex',alignItems:'center',gap:4}}><span style={{fontSize:10,color:'#D97706'}}>R:</span><span style={{fontSize:10,color:'#2d3748'}}>Charge reelle</span></div>
          </div>
        </div>
{/* Congés et notes */}
<div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap',alignItems:'flex-end'}}>
  <div>
    <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>TYPE ABSENCE</div>
    <select style={{...S.select,width:160,background:'#ffffff',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)'}} value={dayOffType} onChange={e=>setDayOffType(e.target.value)}>
      <option value="Conge">Conge</option>
      <option value="RTT">RTT</option>
      <option value="Maladie">Maladie</option>
      <option value="Formation">Formation</option>
      <option value="Ferie">Jour ferie</option>
      <option value="Autre">Autre</option>
    </select>
  </div>
  <button style={{padding:'7px 14px',fontSize:12,fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{
    const newOffs = [...dayOffDays];
    selectedKeys.forEach(key => {
      if (!newOffs.find(d => d.date === key)) newOffs.push({date: key, type: dayOffType});
    });
    setDayOffDays(newOffs);
    showToast(`${selectedDays.size} jour(s) marque(s) ${dayOffType}`);
  }}>Marquer absence</button>
  <button style={{padding:'7px 14px',fontSize:12,fontWeight:600,background:'rgba(34,197,94,0.15)',color:'#16A34A',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,cursor:'pointer',fontFamily:'inherit'}} onClick={()=>{
    setDayOffDays(dayOffDays.filter(d => !selectedKeys.includes(d.date)));
    showToast('Absence(s) retiree(s)');
  }}>Retirer absence</button>
</div>

{/* Note libre */}
<div style={{display:'flex',gap:10,marginBottom:14,alignItems:'flex-end'}}>
  <div style={{flex:1}}>
    <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>NOTE LIBRE</div>
    <input style={{...S.input,background:'#ffffff',border:'1px solid rgba(168,85,247,0.3)'}} placeholder="Ecrire une note pour ce(s) jour(s)..." value={noteInput} onChange={e=>setNoteInput(e.target.value)}/>
  </div>
  <button style={S.btn('accent')} onClick={()=>{
    if(!noteInput.trim()) return;
    const newNotes = {...dayNotes};
    selectedKeys.forEach(key => { newNotes[key] = noteInput.trim(); });
    setDayNotes(newNotes);
    setNoteInput('');
    showToast('Note ajoutee !');
  }}>Ajouter note</button>
  <button style={{...S.btn('ghost'),color:'#DC2626',borderColor:'rgba(239,68,68,0.3)'}} onClick={()=>{
    const newNotes = {...dayNotes};
    selectedKeys.forEach(key => { delete newNotes[key]; });
    setDayNotes(newNotes);
    showToast('Note(s) supprimee(s)');
  }}>Supprimer note</button>
</div>

{/* Afficher les notes existantes */}
{selectedDays.size === 1 && dayNotes[selectedKeys[0]] && (
  <div style={{padding:'8px 14px',background:'rgba(168,85,247,0.08)',border:'1px solid rgba(168,85,247,0.2)',borderRadius:8,marginBottom:12}}>
    <div style={{fontSize:10,fontWeight:600,color:'#a855f7',marginBottom:4}}>NOTE</div>
    <div style={{fontSize:12,color:'#000000'}}>{dayNotes[selectedKeys[0]]}</div>
  </div>
)}
        {/* Actions sur sélection */}
        {selectedDays.size > 0 && (
          <div style={{...S.card, padding:'14px 18px', marginBottom:18, border:'1px solid rgba(0,196,240,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#0070AD'}}>
                {selectedDays.size === 1
                  ? `${[...selectedDays][0]} ${MONTHS[month]} ${year}`
                  : `${selectedDays.size} jours selectionnes : ${[...selectedDays].sort((a,b)=>a-b).join(', ')}`
                }
              </div>
              <div style={{marginLeft:'auto',display:'flex',gap:6}}>
                <button style={{...S.btn('ghost'),fontSize:10,padding:'4px 10px'}} onClick={() => setSelectedDays(new Set())}>Deselectionner</button>
                {selectedDays.size >= 2 && (
                  <button style={{fontSize:10,padding:'4px 10px',fontWeight:600,background:'rgba(0,196,240,0.15)',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={handleCopyToSelected}>Copier J1 → autres</button>
                )}
                <button style={{fontSize:10,padding:'4px 10px',fontWeight:600,background:'rgba(239,68,68,0.15)',color:'#DC2626',border:'1px solid rgba(239,68,68,0.3)',borderRadius:6,cursor:'pointer',fontFamily:'inherit'}} onClick={handleClearSelected}>Vider selection</button>
              </div>
            </div>

            {/* Ajouter tâche */}
            <div style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
              <div style={{flex:1,minWidth:200}}>
                <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>TACHE</div>
                <select style={{...S.select,background:'#ffffff',color:'#0070AD',border:'1px solid rgba(0,196,240,0.3)'}} value={selTask} onChange={e=>setSelTask(e.target.value)}>
                  <option value="" style={{background:'#ffffff',color:'#2d3748'}}>-- Choisir une tache --</option>
                  {CATEGORIES.map((cat, ci) => (
                    <optgroup key={ci} label={cat.cat} style={{background:'#ffffff',color:'#2d3748'}}>
                      {cat.tasks.map((t,ti) => (
                        <option key={ti} value={t.name} style={{background:'#ffffff',color:'#000000'}}>{t.name} ({fmtMin(t.dur)})</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>FREQ</div>
                <input style={{...S.input,width:60,textAlign:'center',background:'#ffffff',border:'1px solid rgba(0,196,240,0.3)',color:'#0070AD'}} type="number" min="1" value={freq} onChange={e=>setFreq(parseInt(e.target.value)||1)}/>
              </div>
              <button style={S.btn('accent')} onClick={handleAddTask}>Ajouter a {selectedDays.size} jour(s)</button>
            </div>

            {/* Tâches des jours sélectionnés */}
            {combinedTasks.length > 0 && (
              <div style={{marginTop:14}}>
                <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:8}}>TACHES PLANIFIEES ({combinedTasks.length})</div>
                {selectedDays.size === 1 ? (
                  // Vue simple pour un seul jour
                  (prevData[selectedKeys[0]] || []).map((t, i) => {
                    const taskInfo = allTasks.find(at => at.name === t.task);
                    return (
                      <div key={i} style={{display:'flex',alignItems:'center',gap:10,...S.card,padding:'8px 14px',marginBottom:4}}>
                        <div style={{width:24,height:24,borderRadius:'50%',background:'#0070ad',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700}}>{i+1}</div>
                        <div style={{flex:1,fontSize:12}}>{t.task}</div>
                        <div style={{fontSize:11,color:'#0070AD',...S.mono}}>x{t.freq} · {fmtMin((taskInfo?.dur || 0) * t.freq)}</div>
                        <div style={{cursor:'pointer',color:'#DC2626',fontSize:14,padding:'2px 6px'}} onClick={() => handleRemoveTask(selectedKeys[0], i)}>✕</div>
                      </div>
                    );
                  })
                ) : (
                  // Vue groupée par jour
                  [...selectedDays].sort((a,b)=>a-b).map(d => {
                    const dk = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const tasks = prevData[dk] || [];
                    if (tasks.length === 0) return null;
                    const dayCharge = tasks.reduce((a,t) => {
                      const f = allTasks.find(at => at.name === t.task);
                      return a + (f ? f.dur * t.freq : 0);
                    }, 0);
                    return (
                      <div key={d} style={{marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                          <span style={{fontSize:12,fontWeight:700,color:'#0070AD'}}>{d} {MONTHS[month]}</span>
                          <span style={{fontSize:10,color:dayCharge>480?'#DC2626':'#2d3748',...S.mono}}>{fmtMin(dayCharge)}</span>
                        </div>
                        {tasks.map((t, ti) => {
                          const taskInfo = allTasks.find(at => at.name === t.task);
                          return (
                            <div key={ti} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 12px',marginBottom:2,marginLeft:16,background:'#f9fafb',borderRadius:6}}>
                              <div style={{fontSize:11,flex:1}}>{t.task}</div>
                              <div style={{fontSize:10,color:'#0070AD',...S.mono}}>x{t.freq} · {fmtMin((taskInfo?.dur || 0) * t.freq)}</div>
                              <div style={{cursor:'pointer',color:'#DC2626',fontSize:12,padding:'2px 4px'}} onClick={() => handleRemoveTask(dk, ti)}>✕</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Graphe Prévision vs Réel */}
        {graphData.length > 0 && <>
          <SectionTitle>Prevision vs Reel — {MONTHS[month]} {year}</SectionTitle>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={graphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                <XAxis dataKey="name" tick={{fill:'#2d3748',fontSize:10}}/>
                <YAxis tick={{fill:'#2d3748',fontSize:10}} tickFormatter={v=>fmtMin(v)}/>
                <Tooltip contentStyle={{background:'#ffffff',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,color:'#000000'}} formatter={v=>fmtMin(v)}/>
                <Legend/>
                <Bar dataKey="prev" fill="#0070ad" name="Prevision" radius={[4,4,0,0]}/>
                <Bar dataKey="reel" fill="#ffd700" name="Reel" radius={[4,4,0,0]}/>
                <Line type="monotone" dataKey="obj" stroke="#16A34A" strokeDasharray="5 5" name="Objectif 8h" dot={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>}

        {/* KPIs résumé */}
        <SectionTitle>Resume du mois</SectionTitle>
        <div style={{...S.grid(4), marginBottom:18}}>
          <div style={S.card}>
            <div style={S.cardTitle}>Jours planifies</div>
            <div style={S.cardValue}>{totalDays}</div>
            <div style={S.cardSub}>sur {daysInMonth} jours</div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Charge prevue</div>
            <div style={{...S.cardValue,...S.mono,fontSize:20}}>{fmtMin(totalMin)}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Moy/jour</div>
            <div style={{...S.cardValue,...S.mono,fontSize:20,color:totalDays&&totalMin/totalDays>480?'#DC2626':'#00c4f0'}}>{totalDays?fmtMin(Math.round(totalMin/totalDays)):'0h00'}</div>
          </div>
          <div style={S.card}>
            <div style={S.cardTitle}>Charge reelle mois</div>
            <div style={{...S.cardValue,...S.mono,fontSize:20,color:'#D97706'}}>
              {fmtMin(Object.entries(realChargeByDate).filter(([k]) => k.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).reduce((a,[,v]) => a+v, 0))}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button style={S.btn('ghost')} onClick={() => {
            // Sélectionner tous les jours ouvrables
            const s = new Set();
            for (let d = 1; d <= daysInMonth; d++) {
              if (((firstDay + d - 1) % 7) < 5) s.add(d);
            }
            setSelectedDays(s);
            showToast(s.size + ' jours ouvrables selectionnes');
          }}>Selectionner jours ouvrables</button>
          <button style={S.btn('ghost')} onClick={() => setSelectedDays(new Set())}>Tout deselectionner</button>
          <button style={{...S.btn('ghost'),color:'#DC2626',borderColor:'rgba(239,68,68,0.3)'}} onClick={() => {
            setPrevData({});
            showToast('Previsions du mois effacees');
          }}>Reinitialiser le mois</button>
        </div>
      </div>
    </div>
  );
};

// ═══ ONGOING (COS) ═══
// ═══ ONGOING (COS) ═══
const OngoingView = ({showToast, currentUser}) => {
  const [allDeclarations, setAllDeclarations] = useState([]);
  const [durationsSpent, setDurationsSpent] = useState({});
  const [statusChanges, setStatusChanges] = useState({});
const [comments, setComments] = useState({});
  // Charger les déclarations depuis localStorage
  useEffect(() => {
    const loadData = () => {
      const saved = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
      // Filtrer par consultant connecté
      const myDecl = currentUser ? saved.filter(d => d.Consultant === currentUser.name) : saved;
      setAllDeclarations(myDecl);
    };
    loadData();
    // Écouter les changements de localStorage
    window.addEventListener('storage', loadData);
    const interval = setInterval(loadData, 2000);
    return () => { window.removeEventListener('storage', loadData); clearInterval(interval); };
  }, [currentUser]);

  // Tâches en cours (Ongoing)
  const ongoingTasks = allDeclarations.filter(d => d.Status === 'Ongoing');
  // Historique (Processed / Cloturé)
  const historiqueTasks = allDeclarations.filter(d => d.Status === 'Processed');

  // Valider une tâche (garde le statut choisi dans le select)
  const handleValiderTask = (taskIndex) => {
    const task = ongoingTasks[taskIndex];
    const saved = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
    const realIdx = saved.findIndex(d =>
      d.Consultant === task.Consultant &&
      d.Tache === task.Tache &&
      d.Date === task.Date &&
      d['Seller Cofor'] === task['Seller Cofor'] &&
      d.Status === 'Ongoing'
    );
    if (realIdx !== -1) {
      const newStatus = statusChanges[taskIndex] || 'Ongoing';

      // Initialiser l'historique si pas encore créé
      if (!saved[realIdx]['Historique Durees']) {
        saved[realIdx]['Historique Durees'] = [];
      }

      // Ajouter la durée du jour à l'historique
      if (durationsSpent[taskIndex]) {
        saved[realIdx]['Historique Durees'].push({
          date: new Date().toISOString().split('T')[0],
          duree: parseInt(durationsSpent[taskIndex]) || 0
        });
      }

      // Calculer le total cumulé
      const totalCumule = saved[realIdx]['Historique Durees'].reduce((sum, h) => sum + h.duree, 0);
      saved[realIdx]['Duree Consacree (min)'] = totalCumule;
      saved[realIdx]['Derniere MAJ'] = new Date().toISOString().split('T')[0];

      if (comments[taskIndex]) {
        saved[realIdx]['Commentaire'] = comments[taskIndex];
      }

      saved[realIdx].Status = newStatus;
      if (newStatus === 'Processed') {
        saved[realIdx]['Date Cloture'] = new Date().toISOString().split('T')[0];
        saved[realIdx]['Duree Totale (min)'] = totalCumule;
      }

      localStorage.setItem('workload_declarations', JSON.stringify(saved));
      // Pousser la modification au backend (best-effort)
      const backendId = saved[realIdx]._backend_id;
      if (backendId) {
        updateDeclarationInBackend(backendId, {
          realDurationMin: totalCumule,
          status: newStatus === 'Processed' ? 'done' : 'ongoing',
        });
      }
      setAllDeclarations(currentUser ? saved.filter(d => d.Consultant === currentUser.name) : saved);
      setDurationsSpent(prev => { const n = {...prev}; delete n[taskIndex]; return n; });
      setStatusChanges(prev => { const n = {...prev}; delete n[taskIndex]; return n; });
      setComments(prev => { const n = {...prev}; delete n[taskIndex]; return n; });
      showToast(newStatus === 'Processed' ? `Tache cloturee ! Total: ${totalCumule} min` : `+${durationsSpent[taskIndex] || 0} min ajoutees (Total: ${totalCumule} min)`);
    }
  };

  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>Ongoing Workload</div>
        <div style={S.topDesc}>Taches en cours & Historique</div>
      </div>
      <div style={S.content}>

        {/* ═══ TACHES EN COURS ═══ */}
        <SectionTitle>Taches en cours ({ongoingTasks.length})</SectionTitle>
        {ongoingTasks.length === 0 ? (
          <div style={{...S.card, padding:'20px', textAlign:'center', color:'#2d3748', fontSize:13}}>
            Aucune tache en cours. Les taches "Ongoing" de vos declarations apparaitront ici.
          </div>
        ) : (
          <table style={S.table}>
          <thead>
            <tr>
              {['Tache (Livrable)','Fournisseur','Date décl.','Dernière MAJ','Std (min)','Durée consacrée','Commentaire','Status','Action'].map(h =>
                <th key={h} style={S.th}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {ongoingTasks.map((t, i) => (
              <tr key={i}>
                <td style={{...S.td,fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{t.Livrable || t.Tache}</td>
                <td style={S.td}>{t['Seller Cofor'] || '-'}</td>
                <td style={S.td}>{t.Date}</td>
                <td style={{...S.td, fontSize:11, color:'#0070AD'}}>{t['Derniere MAJ'] || '-'}</td>
                <td style={{...S.td, color:'#0070AD'}}>{t['Duree Standard (min)'] || '-'}</td>
                <td style={S.td}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <input
                      style={{width:60,fontSize:11,textAlign:'center',background:'#f9fafb',border:'1px solid rgba(217,119,6,0.3)',borderRadius:6,padding:'4px 6px',color:'#D97706'}}
                      placeholder={t['Duree Consacree (min)'] ? String(t['Duree Consacree (min)']) : 'min'}
                      type="number"
                      value={durationsSpent[i] || ''}
                      onChange={e => setDurationsSpent({...durationsSpent, [i]: e.target.value})}
                    />
                    {t['Duree Consacree (min)'] && !durationsSpent[i] && (
                      <span style={{fontSize:10,color:'#2d3748'}}>({t['Duree Consacree (min)']} min)</span>
                    )}
                  </div>
                </td>
                <td style={S.td}>
                  <input
                    style={{width:120,fontSize:11,background:'#f9fafb',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color:'#000000'}}
                    placeholder={t['Commentaire'] || 'Pourquoi ongoing...'}
                    value={comments[i] || ''}
                    onChange={e => setComments({...comments, [i]: e.target.value})}
                  />
                </td>
                <td style={S.td}>
                  <select
                    style={{fontSize:10,background:'#f9fafb',border:'1px solid #e2e8f0',borderRadius:6,padding:'4px 6px',color: (statusChanges[i] || t.Status) === 'Ongoing' ? '#D97706' : '#16A34A',cursor:'pointer'}}
                    value={statusChanges[i] || t.Status}
                    onChange={e => setStatusChanges({...statusChanges, [i]: e.target.value})}
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Processed">Processed</option>
                  </select>
                </td>
                <td style={S.td}>
                  <button
                    style={{...S.btn('accent'), padding:'4px 12px', fontSize:11}}
                    onClick={() => handleValiderTask(i)}
                  >
                    Valider
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}

        {/* ═══ HISTORIQUE ═══ */}
        <div style={{marginTop:28}}>
          <SectionTitle>Historique ({historiqueTasks.length})</SectionTitle>
        </div>
        {historiqueTasks.length === 0 ? (
          <div style={{...S.card, padding:'20px', textAlign:'center', color:'#2d3748', fontSize:13}}>
            Aucune tache cloturee. Les taches terminees apparaitront ici.
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
{['Tache (Livrable)','Fournisseur','Date ouverture','Date cloture','Std (min)','Reel (min)','Commentaire','Status'].map(h =>                  <th key={h} style={S.th}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {historiqueTasks.slice().reverse().map((t, i) => (
                <tr key={i}>
                  <td style={{...S.td, fontSize:11, fontFamily:"'JetBrains Mono',monospace"}}>{t.Livrable || t.Tache}</td>
                  <td style={S.td}>{t['Seller Cofor'] || '-'}</td>
                  <td style={S.td}>{t.Date}</td>
                  <td style={S.td}>{t['Date Cloture'] || t.Date}</td>
                  <td style={{...S.td, color:'#0070AD'}}>{t['Duree Standard (min)'] || '-'}</td>
                  <td style={{...S.td, color:'#D97706'}}>{t['Duree Consacree (min)'] || t['Duree Reelle (min)'] || '-'}</td>
                  <td style={{...S.td, fontSize:11, color:'#2d3748'}}>{t['Commentaire'] || '-'}</td>
                  <td style={S.td}>
                    <span style={{padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,background:'rgba(34,197,94,0.15)',color:'#16A34A'}}>
                      Processed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// ═══ RECOMMANDATIONS (COS) ═══
// === GEO MAP component - phase 8.4 ===
// Helper : DivIcon colore (cercle avec bord)
const makeColorIcon = (color) => L.divIcon({
  className: 'geo-marker-' + color,
  html: '<div style="width:14px;height:14px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});
const SUPPLIER_ICON = makeColorIcon('#ea580c');  // orange
const DOCK_ICON     = makeColorIcon('#0070ad');  // bleu Capgemini

// Sub-component : zoome sur des coords des qu'elles changent
const MapFlyTo = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 12, { duration: 1.2 });
  }, [position, map]);
  return null;
};

// Sub-component : ajuste la vue de la carte sur les markers filtres
const MapFitBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (!markers || markers.length === 0) return;
    if (markers.length === 1) {
      map.flyTo([markers[0].lat, markers[0].lng], 12, { duration: 1.0 });
    } else {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      map.fitBounds(bounds, { padding: [60, 60], duration: 1.0 });
    }
  }, [markers, map]);
  return null;
};

// Sub-component : zoome + ouvre le popup d'un marker precis (navigation un-par-un)
const MapFlyToMarker = ({ marker, supplierIndex }) => {
  const map = useMap();
  useEffect(() => {
    if (!marker) return;
    map.flyTo([marker.lat, marker.lng], 12, { duration: 0.8 });
    // L'ouverture du popup est faite via openPopup dans le Marker (cf. ref ci-dessous)
  }, [marker, supplierIndex, map]);
  return null;
};

const GeoMap = ({ geoData }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!geoData) {
    return (
      <div style={{...S.card, padding:'40px 20px', textAlign:'center', color:'#2d3748', fontSize:13}}>
        Charge ton fichier Excel pour voir la carte.
      </div>
    );
  }

  // Helper : matching multi-champs avec ET logique entre les criteres separes par virgule
  const matchSupplier = (s, q) => {
    if (!q) return true;
    const terms = q.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (terms.length === 0) return true;
    const haystack = [s.supplier, s.sellerCofor, s.shipperCofor, s.emptyReturnCofor, s.xfCode, s.city]
      .filter(Boolean).map(f => String(f).toLowerCase()).join(' | ');
    return terms.every(t => haystack.includes(t));
  };

  const filteredSuppliers = filter
    ? geoData.suppliers.filter(s => matchSupplier(s, filter))
    : geoData.suppliers;

  const allDockMarkers = [];
  geoData.docks.forEach(d => {
    allDockMarkers.push({ name: d.name, lat: d.lat, lng: d.lng, isPrimary: true });
    (d.alternates || []).forEach(a => {
      allDockMarkers.push({ name: a.name + ' (alt. de ' + d.name + ')', lat: a.lat, lng: a.lng, isPrimary: false });
    });
  });

  const handleSearch = () => {
    const q = search.trim();
    if (!q) { setFilter(''); setCurrentIdx(0); return; }
    const matches = geoData.suppliers.filter(s => matchSupplier(s, q));
    if (matches.length === 0) {
      window.alert('Aucun fournisseur trouve pour : ' + q);
      return;
    }
    setFilter(q);
    setCurrentIdx(0);
  };
  const handleReset = () => {
    setSearch('');
    setFilter('');
    setCurrentIdx(0);
  };
  const handlePrev = () => {
    if (filteredSuppliers.length <= 1) return;
    setCurrentIdx((currentIdx - 1 + filteredSuppliers.length) % filteredSuppliers.length);
  };
  const handleNext = () => {
    if (filteredSuppliers.length <= 1) return;
    setCurrentIdx((currentIdx + 1) % filteredSuppliers.length);
  };

  // Marker courant pour la navigation un-par-un
  const currentSupplier = (filter && filteredSuppliers.length > 1) ? filteredSuppliers[currentIdx] : null;

  return (
    <>
      {/* Barre de recherche */}
      <div style={{display:'flex', gap:10, marginBottom:12, alignItems:'center', flexWrap:'wrap'}}>
        <input
          style={{...S.input, flex:1, minWidth:240}}
          placeholder="Filtrer (separer par virgule pour ET logique : ex 'madrid, AMAYA')"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        />
        <button style={S.btn('accent')} onClick={handleSearch}>Filtrer</button>
        {filter && <button style={S.btn('ghost')} onClick={handleReset}>Reset</button>}
      </div>

      {/* Navigation un-par-un quand plusieurs resultats */}
      {filter && filteredSuppliers.length > 1 && (
        <div style={{display:'flex', gap:10, marginBottom:12, alignItems:'center', justifyContent:'center', padding:'8px 14px', background:'rgba(0,112,173,0.06)', border:'1px solid rgba(0,112,173,0.2)', borderRadius:8}}>
          <button style={{...S.btn('ghost'), padding:'6px 14px'}} onClick={handlePrev}>&larr;</button>
          <div style={{fontSize:13, fontWeight:600, color:'#0070ad', minWidth:120, textAlign:'center'}}>
            {currentIdx + 1} / {filteredSuppliers.length}
            <div style={{fontSize:11, fontWeight:400, color:'#2d3748', marginTop:2}}>
              {currentSupplier?.supplier}
            </div>
          </div>
          <button style={{...S.btn('ghost'), padding:'6px 14px'}} onClick={handleNext}>&rarr;</button>
        </div>
      )}

      <div style={{display:'flex', gap:8, marginBottom:8, alignItems:'center', fontSize:11, color:'#2d3748'}}>
        <span style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#ea580c'}} />Fournisseurs ({filteredSuppliers.length}{filter && ' / ' + geoData.suppliers.length})
        <span style={{marginLeft:14, display:'inline-block',width:10,height:10,borderRadius:'50%',background:'#0070ad'}} />Docks ({allDockMarkers.length})
      </div>

      <div style={{height:600, width:'100%', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', marginBottom:18}}>
        <MapContainer center={[48, 5]} zoom={4} style={{height:'100%', width:'100%'}}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit a chaque changement de filtre */}
          {filter && filteredSuppliers.length > 1 && currentIdx === 0 && <MapFitBounds markers={filteredSuppliers} />}
          {filter && filteredSuppliers.length === 1 && <MapFitBounds markers={filteredSuppliers} />}
          {currentSupplier && <MapFlyToMarker marker={currentSupplier} supplierIndex={currentIdx} />}

          <MarkerClusterGroup chunkedLoading>
            {filteredSuppliers.map((s, i) => (
              <Marker key={'s'+i} position={[s.lat, s.lng]} icon={SUPPLIER_ICON}>
                <Popup>
                  <div style={{fontSize:12, lineHeight:1.5}}>
                    <div style={{fontWeight:700, color:'#ea580c', marginBottom:4}}>{s.supplier}</div>
                    {s.address && <div>{s.address}</div>}
                    {(s.city || s.country) && <div>{s.city} {s.country && '(' + s.country + ')'}</div>}
                    <div style={{fontSize:10, color:'#666', marginTop:4}}>
                      XF: {s.xfCode || '-'} &middot; Seller: {s.sellerCofor || '-'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>

          <MarkerClusterGroup chunkedLoading>
            {allDockMarkers.map((d, i) => (
              <Marker key={'d'+i} position={[d.lat, d.lng]} icon={DOCK_ICON}>
                <Popup>
                  <div style={{fontSize:12, lineHeight:1.5}}>
                    <div style={{fontWeight:700, color:'#0070ad', marginBottom:4}}>{d.name}</div>
                    <div style={{fontSize:10, color:'#666'}}>
                      {d.lat.toFixed(3)}, {d.lng.toFixed(3)}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </>
  );
};


// === MAPPING PANEL (gauche) - phase 8.5c + 8.5d ===
// Helper Haversine cote front (meme formule que le backend)
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

// Matching tolerant : trouve un dock par nom (exact ou tokens majeurs)
const findDockByName = (docks, name) => {
  if (!name) return null;
  const target = String(name).toLowerCase();
  let found = docks.find(d => d.name.toLowerCase() === target);
  if (found) return found;
  const tokens = target.replace(/[-_]/g, ' ').split(/\s+/).filter(t => t.length > 2);
  found = docks.find(d => {
    const dl = d.name.toLowerCase();
    return tokens.every(t => dl.includes(t));
  });
  return found || null;
};

const MappingPanel = ({ geoData }) => {
  const [sellerCofor, setSellerCofor] = useState('');
  const [emptyReturnCofor, setEmptyReturnCofor] = useState('');
  const [searched, setSearched] = useState(null); // { supplier, top5docks } ou null

  const handleSearch = () => {
    const seller = sellerCofor.trim();
    const empty = emptyReturnCofor.trim();
    if (!seller && !empty) {
      window.alert("Saisir au moins un cofor (seller ou empty return)");
      return;
    }

    // 1. Trouver le fournisseur (ET logique entre criteres saisis)
    const supplier = geoData.suppliers.find(s => {
      if (seller && s.seller_cofor !== seller) return false;
      if (empty && s.empty_return_cofor !== empty) return false;
      return true;
    });
    if (!supplier) {
      window.alert("Aucun fournisseur trouve pour ces criteres");
      return;
    }

    // 2. Recuperer les docks lies (Availability)
    const availLines = geoData.availability.filter(a => {
      if (seller && a.seller_cofor !== seller) return false;
      if (empty && a.empty_return_cofor !== empty) return false;
      return true;
    });

    // 3. Collecter les noms uniques (pooling_dock + alternates)
    const dockNames = new Set();
    availLines.forEach(a => {
      if (a.pooling_dock) dockNames.add(a.pooling_dock);
      (a.alternates || []).forEach(alt => dockNames.add(alt));
    });

    // 4. Resoudre vers les docks geocodes + calcul distance
    const docksWithDist = [];
    dockNames.forEach(name => {
      const dock = findDockByName(geoData.docks, name);
      if (dock) {
        docksWithDist.push({
          ...dock,
          distance_km: haversineKm(supplier.lat, supplier.lng, dock.lat, dock.lng),
          source_name: name,
        });
      }
    });

    if (docksWithDist.length === 0) {
      window.alert("Fournisseur trouve mais aucun dock lie n'a ete localise");
      return;
    }

    // 5. Tri par distance + top 5
    docksWithDist.sort((a, b) => a.distance_km - b.distance_km);
    const top5 = docksWithDist.slice(0, 5);

    setSearched({ supplier, top5docks: top5 });
  };

  const handleReset = () => {
    setSellerCofor('');
    setEmptyReturnCofor('');
    setSearched(null);
  };

  // Markers a afficher : tous les docks par defaut, ou seulement le top 5 si recherche active
  const docksToShow = searched ? searched.top5docks : geoData.docks;
  const supplierMarker = searched ? searched.supplier : null;

  return (
    <div>
      {/* Champs de recherche */}
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:12}}>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>SELLER COFOR</div>
          <input
            style={S.input}
            placeholder="Ex: 01007U  01"
            value={sellerCofor}
            onChange={e => setSellerCofor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>EMPTY RETURN COFOR</div>
          <input
            style={S.input}
            placeholder="Ex: 01007U  01"
            value={emptyReturnCofor}
            onChange={e => setEmptyReturnCofor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          />
        </div>
        <div style={{display:'flex', gap:8}}>
          <button style={{...S.btn('accent'), flex:1}} onClick={handleSearch}>Rechercher</button>
          {searched && <button style={{...S.btn('ghost')}} onClick={handleReset}>Reset</button>}
        </div>
      </div>

      {/* Resume du resultat */}
      {searched && (
        <div style={{padding:'8px 12px', background:'rgba(0,112,173,0.06)', border:'1px solid rgba(0,112,173,0.2)', borderRadius:8, marginBottom:10, fontSize:11}}>
          <div style={{fontWeight:700, color:'#ea580c', marginBottom:2}}>{searched.supplier.supplier_name}</div>
          <div style={{color:'#2d3748'}}>{searched.supplier.city}{searched.supplier.country && ', ' + searched.supplier.country}</div>
          <div style={{color:'#0070ad', marginTop:4}}>Top {searched.top5docks.length} docks :</div>
          {searched.top5docks.map((d, i) => (
            <div key={i} style={{fontSize:10, marginLeft:8}}>
              {i + 1}. {d.name} ({d.distance_km.toFixed(0)} km)
            </div>
          ))}
        </div>
      )}

      {/* Carte */}
      <div style={{height:380, width:'100%', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden'}}>
        <MapContainer center={[48, 5]} zoom={4} style={{height:'100%', width:'100%'}}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit sur le supplier + ses 5 docks quand recherche active */}
          {searched && <MapFitBounds markers={[searched.supplier, ...searched.top5docks]} />}

          {/* Marker du fournisseur (orange) si recherche active */}
          {supplierMarker && (
            <Marker position={[supplierMarker.lat, supplierMarker.lng]} icon={SUPPLIER_ICON}>
              <Popup>
                <div style={{fontSize:12, lineHeight:1.5}}>
                  <div style={{fontWeight:700, color:'#ea580c', marginBottom:4}}>{supplierMarker.supplier_name}</div>
                  {supplierMarker.address && <div style={{fontSize:11}}>{supplierMarker.address}</div>}
                  {(supplierMarker.city || supplierMarker.country) && <div style={{fontSize:11}}>{supplierMarker.city}{supplierMarker.country && ', ' + supplierMarker.country}</div>}
                  <div style={{fontSize:10, color:'#666', marginTop:4}}>
                    Seller: {supplierMarker.seller_cofor || '-'} - Empty: {supplierMarker.empty_return_cofor || '-'}
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Markers des docks */}
          {docksToShow.map((d) => (
            <Marker key={'dock-' + d.id} position={[d.lat, d.lng]} icon={DOCK_ICON}>
              <Popup>
                <div style={{fontSize:12, lineHeight:1.5}}>
                  <div style={{fontWeight:700, color:'#0070ad', marginBottom:4}}>{d.name}</div>
                  {d.city && <div style={{fontSize:11}}>{d.city}{d.country && ', ' + d.country}</div>}
                  {d.distance_km !== undefined && (
                    <div style={{fontSize:11, color:'#0070ad', marginTop:4}}>Distance : {d.distance_km.toFixed(0)} km</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

// === AGENT IA PANEL (droite) - phase 8.6c ===
const AgentIAPanel = () => {
  const [stockSummary, setStockSummary] = useState(null);
  const [stockUploading, setStockUploading] = useState(false);

  // Charger le summary au mount
  useEffect(() => {
    (async () => {
      try {
        const s = await api.getStockSummary();
        setStockSummary(s);
      } catch (err) {
        console.warn("Stock summary indisponible:", err.message);
      }
    })();
  }, []);

  const handleStockUpload = async (file) => {
    if (!file) return;
    setStockUploading(true);
    try {
      const result = await api.uploadStockFile(file);
      // Refresh summary
      const s = await api.getStockSummary();
      setStockSummary(s);
      window.alert(result.message);
    } catch (err) {
      window.alert("Erreur upload : " + err.message);
    } finally {
      setStockUploading(false);
    }
  };

  const [packagingCode, setPackagingCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [sellerCofor, setSellerCofor] = useState('');
  const [emptyReturnCofor, setEmptyReturnCofor] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const handleAnalyze = async () => {
    setError(null);
    setResult(null);
    if (!packagingCode.trim() || !quantity || !sellerCofor.trim() || !emptyReturnCofor.trim()) {
      setError("Tous les champs sont obligatoires");
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError("La quantite doit etre un nombre positif");
      return;
    }
    setLoading(true);
    try {
      const reco = await api.recommendDocks({
        packaging_code: packagingCode.trim(),
        quantity: qty,
        seller_cofor: sellerCofor.trim(),
        empty_return_cofor: emptyReturnCofor.trim(),
      });
      setResult(reco);
      setShowAlternatives(false);
    } catch (err) {
      setError(err.message || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPackagingCode('');
    setQuantity('');
    setSellerCofor('');
    setEmptyReturnCofor('');
    setResult(null);
    setError(null);
    setShowAlternatives(false);
  };

  // Helpers d'affichage
  const renderPlan = (plan, isPrimary) => {
    if (!plan) return null;
    return (
      <div style={{padding:'10px 12px', background: isPrimary ? 'rgba(0,112,173,0.06)' : 'rgba(150,150,150,0.06)', border: isPrimary ? '1px solid rgba(0,112,173,0.3)' : '1px solid #e2e8f0', borderRadius:8, marginBottom:8}}>
        <div style={{fontSize:12, fontWeight:700, color: isPrimary ? '#0070ad' : '#2d3748', marginBottom:6}}>
          {plan.plan_label}
        </div>
        <div style={{marginBottom:6}}>
          {plan.splits.map((s, i) => (
            <div key={i} style={{fontSize:11, padding:'4px 0', borderBottom:'1px solid #f0f0f0'}}>
              <span style={{fontWeight:600}}>{s.dock_name}</span>
              <span style={{float:'right', color:'#0070ad', fontWeight:700}}>
                {s.qty} ({s.percent}%)
              </span>
            </div>
          ))}
        </div>
        <div style={{fontSize:10, color:'#666', fontStyle:'italic'}}>{plan.reasoning}</div>
      </div>
    );
  };

  return (
    <div>
      {/* Stock fichier (charge en BDD via /api/geo/upload-stock) */}
      <div style={{padding:'10px 12px', background:'#f9fafb', border:'1px solid #e2e8f0', borderRadius:8, marginBottom:12}}>
        <div style={{fontSize:11, fontWeight:700, color:'#2d3748', marginBottom:6}}>FICHIER STOCK SEMAINE</div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
          <input
            type="file"
            accept=".xlsx,.xls"
            disabled={stockUploading}
            onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; handleStockUpload(f); }}
            style={{fontSize:11, fontFamily:'inherit'}}
          />
          {stockUploading && <span style={{fontSize:10, color:'#666'}}>Upload en cours...</span>}
        </div>
        <div style={{fontSize:10, color:'#666', marginTop:6}}>
          {stockSummary
            ? (stockSummary.total > 0
                ? <>Charge : {stockSummary.total} entrees{stockSummary.uploaded_at && ' - ' + new Date(stockSummary.uploaded_at).toLocaleDateString('fr-FR')}</>
                : <em>Aucun stock charge - charge un fichier pour activer l'analyse</em>)
            : 'Verification...'}
        </div>
      </div>

      {/* Inputs */}
      <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:12}}>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>PACKAGING CODE</div>
          <input style={S.input} placeholder="Ex: R4280" value={packagingCode} onChange={e => setPackagingCode(e.target.value)} />
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>QUANTITE BESOIN</div>
          <input style={S.input} type="number" placeholder="Ex: 1000" value={quantity} onChange={e => setQuantity(e.target.value)} />
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>SELLER COFOR</div>
          <input style={S.input} placeholder="Ex: 01007U  01" value={sellerCofor} onChange={e => setSellerCofor(e.target.value)} />
        </div>
        <div>
          <div style={{fontSize:11, fontWeight:600, color:'#2d3748', marginBottom:4}}>EMPTY RETURN COFOR</div>
          <input style={S.input} placeholder="Ex: 01007U  01" value={emptyReturnCofor} onChange={e => setEmptyReturnCofor(e.target.value)} />
        </div>
        <div style={{display:'flex', gap:8, marginTop:4}}>
          <button style={{...S.btn('accent'), flex:1}} onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analyse en cours...' : 'Analyser'}
          </button>
          {(result || error) && (
            <button style={S.btn('ghost')} onClick={handleReset}>Reset</button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{padding:'14px', textAlign:'center', fontSize:11, color:'#666', background:'rgba(0,112,173,0.06)', borderRadius:8}}>
          L'IA analyse votre besoin... (10-15 secondes)
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div style={{padding:'10px 12px', background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:8, fontSize:11, color:'#DC2626'}}>
          <div style={{fontWeight:600, marginBottom:4}}>Erreur</div>
          <div>{error}</div>
        </div>
      )}

      {/* Resultat */}
      {result && !loading && (
        <div>
          {/* Cas erreur metier (fournisseur introuvable, pas de stock) */}
          {result.error && (
            <div style={{padding:'10px 12px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.4)', borderRadius:8, fontSize:11, color:'#92400E', marginBottom:8}}>
              <div style={{fontWeight:700, marginBottom:4}}>{result.error}</div>
              <div>{result.message}</div>
            </div>
          )}

          {/* Cas normal : afficher le supplier + les plans */}
          {!result.error && result.supplier && (
            <>
              {/* Bandeau supplier */}
              <div style={{padding:'8px 12px', background:'rgba(234,88,12,0.06)', border:'1px solid rgba(234,88,12,0.3)', borderRadius:8, marginBottom:8, fontSize:11}}>
                <div style={{fontWeight:700, color:'#ea580c'}}>{result.supplier.name}</div>
                <div style={{color:'#2d3748'}}>{result.supplier.city}{result.supplier.country && ', ' + result.supplier.country}</div>
                {result.mode === 'fallback_geographic' && (
                  <div style={{marginTop:4, padding:'4px 8px', background:'rgba(245,158,11,0.15)', borderRadius:4, color:'#92400E'}}>
                    Penurie sur les docks lies - recherche elargie aux docks proches
                  </div>
                )}
              </div>

              {/* Plan principal */}
              {result.primary && renderPlan(result.primary, true)}

              {/* Bouton voir alternatives */}
              {result.alternatives && result.alternatives.length > 0 && (
                <div style={{marginTop:6}}>
                  <button
                    style={{...S.btn('ghost'), width:'100%', fontSize:11}}
                    onClick={() => setShowAlternatives(!showAlternatives)}
                  >
                    {showAlternatives ? 'Masquer' : 'Voir'} les alternatives ({result.alternatives.length})
                  </button>
                </div>
              )}

              {/* Alternatives expanded */}
              {showAlternatives && result.alternatives.map((alt, i) => (
                <div key={i} style={{marginTop:6}}>
                  {renderPlan(alt, false)}
                </div>
              ))}

              {/* Summary */}
              {result.summary && (
                <div style={{marginTop:8, padding:'8px 10px', background:'#f9fafb', borderRadius:6, fontSize:10, color:'#666', fontStyle:'italic'}}>
                  {result.summary}
                </div>
              )}

              {/* Modele LLM utilise */}
              {result.model_used && (
                <div style={{marginTop:6, fontSize:9, color:'#94a3b8', textAlign:'right'}}>
                  Modele: {result.model_used}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// === GEO VIEW (consultant) - phase 8.3 ===
const GeoView = ({showToast, currentUser}) => {
  // Donnees geo chargees depuis le backend (BDD seed via seed_geo.py)
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoLoadError, setGeoLoadError] = useState(null);

  // Fetch automatique au mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setGeoLoading(true);
      setGeoLoadError(null);
      try {
        const data = await api.getGeoData();
        if (cancelled) return;
        setGeoData({
          suppliers: data.suppliers || [],
          docks: data.docks || [],
          availability: data.availability || [],
        });
      } catch (err) {
        if (cancelled) return;
        console.error("Erreur fetch geo data:", err);
        setGeoLoadError(err.message || "Impossible de charger les donnees geo.");
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div style={S.topbar}>
        <div style={S.topTitle}>Mapping - Geolocalisation</div>
        <div style={S.topDesc}>{todayStr()}</div>
      </div>
      <div style={S.content}>
        {geoLoading && (
          <div style={{...S.card, padding:'40px 20px', textAlign:'center', color:'#2d3748', fontSize:13}}>
            Chargement des donnees geo...
          </div>
        )}

        {geoLoadError && (
          <div style={{...S.card, padding:'20px', textAlign:'center', color:'#DC2626', fontSize:13, border:'1px solid rgba(220,38,38,0.3)', background:'rgba(220,38,38,0.06)'}}>
            <div style={{fontWeight:600, marginBottom:6}}>Erreur de chargement</div>
            <div>{geoLoadError}</div>
            <div style={{fontSize:11, color:'#666', marginTop:8}}>
              Verifie que le backend tourne et que le seed a ete execute.
            </div>
          </div>
        )}

        {!geoLoading && !geoLoadError && geoData && (
          <>
            {/* Bandeau infos donnees chargees */}
            <div style={S.aiCard}>
              <div style={S.aiBadge}>Donnees chargees</div>
              <div style={{fontSize:13, color:'#2d3748'}}>
                {geoData.suppliers.length} fournisseurs - {geoData.docks.length} docks - {geoData.availability.length} liaisons availability
              </div>
            </div>

            {/* Layout 50/50 : Mapping a gauche, Agent IA a droite */}
            <div style={{display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-start'}}>

              {/* === MAPPING (gauche) === */}
              <div style={{flex:'1 1 320px', minWidth:0}}>
                <SectionTitle>Mapping</SectionTitle>
                <MappingPanel geoData={geoData} />
              </div>

              {/* === AGENT IA (droite) === */}
              <div style={{flex:'1 1 320px', minWidth:0}}>
                <SectionTitle>Agent IA</SectionTitle>
                <AgentIAPanel />
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

const RecoView = ({showToast}) => {
  const [recos,setRecos] = useState([{text:"L'affichage des taches pourrait etre plus grand",date:'24 Mars 2026'}]);
  const [input,setInput] = useState('');
  return (
    <div>
      <div style={S.topbar}><div style={S.topTitle}>Recommandations</div></div>
      <div style={S.content}>
        <div style={{...S.card,padding:'18px 22px'}}>
          <SectionTitle>Votre suggestion</SectionTitle>
          <div style={{display:'flex',gap:10}}><input style={{...S.input,flex:1}} placeholder="Ecrivez votre recommandation..." value={input} onChange={e=>setInput(e.target.value)}/><button style={S.btn('accent')} onClick={()=>{if(!input.trim())return;setRecos([{text:input,date:todayStr()},...recos]);setInput('');showToast('Envoyee !');}}>Envoyer</button></div>
        </div>
        <div style={{marginTop:22}}><SectionTitle>Envoyees</SectionTitle></div>
        {recos.map((r,i)=><div key={i} style={{...S.card,padding:'10px 14px',fontSize:12,display:'flex',justifyContent:'space-between',marginBottom:8}}><div>{r.text}</div><div style={{fontSize:10,color:'#2d3748',flexShrink:0,marginLeft:10}}>{r.date}</div></div>)}
      </div>
    </div>
  );
};

// ═══ POWER BI ═══
const PowerBIView = () => (
  <div>
    <div style={S.topbar}><div style={S.topTitle}>Power BI</div></div>
    <div style={{...S.content,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',textAlign:'center'}}>
      <div style={{fontSize:22,fontWeight:700,color:'#D97706',marginBottom:8}}>Redirection vers Power BI</div>
      <div style={{fontSize:14,color:'#2d3748',marginBottom:28}}>SSO Stellantis</div>
      <button style={{...S.btn('accent'),fontSize:14,padding:'12px 32px'}}>Ouvrir Power BI</button>
    </div>
  </div>
);
const ProfilView = ({currentUser, showToast, onSwitchView}) => {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(() => localStorage.getItem('workload_photo_' + (currentUser?.email || '')) || '');

  const handleChangePassword = () => {
    setError('');
    if (!oldPwd.trim()) { setError('Saisissez votre mot de passe actuel.'); return; }
    if (!newPwd.trim()) { setError('Saisissez un nouveau mot de passe.'); return; }
    if (newPwd.length < 6) { setError('Minimum 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas.'); return; }

    const savedPasswords = JSON.parse(localStorage.getItem('workload_passwords') || '{}');
    const user = findUserByEmail(currentUser.email);
    const currentPassword = savedPasswords[currentUser.email] || user?.password;

    if (oldPwd !== currentPassword) { setError('Mot de passe actuel incorrect.'); return; }

    savedPasswords[currentUser.email] = newPwd;
    localStorage.setItem('workload_passwords', JSON.stringify(savedPasswords));
    setOldPwd(''); setNewPwd(''); setConfirmPwd('');
    showToast('Mot de passe modifie !');
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { showToast('Image trop lourde (max 500KB)'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target.result;
      localStorage.setItem('workload_photo_' + currentUser.email, data);
      setPhoto(data);
      showToast('Photo mise a jour !');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    localStorage.removeItem('workload_photo_' + currentUser.email);
    setPhoto('');
    showToast('Photo supprimee');
  };

  const isPeopleManager = currentUser?.originalRole === 'people_manager';
  const currentViewLabel = currentUser?.role === 'manager' ? 'Manager' : 'Consultant';
  const otherViewLabel = currentUser?.role === 'manager' ? 'Consultant' : 'Manager';

  const getRoleBadge = () => {
    if (isPeopleManager) return { bg: 'rgba(168,85,247,0.15)', color: '#a855f7', label: 'People Manager' };
    if (currentUser?.role === 'manager') return { bg: 'rgba(255,215,0,0.15)', color: '#000000', label: 'Manager' };
    return { bg: 'rgba(0,196,240,0.15)', color: '#00c4f0', label: 'Consultant' };
  };
  const badge = getRoleBadge();

  return (
    <div>
      <div style={S.topbar}><div style={S.topTitle}>Mon Profil</div></div>
      <div style={S.content}>

        {/* Carte profil */}
        <div style={{...S.card, padding:28, marginBottom:22, display:'flex', gap:24, alignItems:'center', flexWrap:'wrap'}}>
          {/* Photo */}
          <div style={{position:'relative'}}>
            {photo ? (
              <img src={photo} alt="profil" style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',border:'3px solid rgba(0,196,240,0.4)'}}/>
            ) : (
              <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#0070ad,#00c4f0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,fontWeight:700,color:'#fff'}}>
                {getInitials(currentUser?.name || '')}
              </div>
            )}
            <label style={{position:'absolute',bottom:-4,right:-4,width:28,height:28,borderRadius:'50%',background:'#0070ad',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'2px solid #112240'}}>
              <span style={{fontSize:14,color:'#fff'}}>📷</span>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
            </label>
          </div>

          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:20,fontWeight:700}}>{currentUser?.name}</div>
            <div style={{fontSize:12,color:'#2d3748',marginTop:4}}>{currentUser?.email}</div>
            <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'4px 12px',borderRadius:20,background:badge.bg,color:badge.color,textTransform:'uppercase'}}>{badge.label}</span>
              {currentUser?.manager && <span style={{fontSize:10,padding:'4px 12px',borderRadius:20,background:'#f1f5f9',color:'#2d3748'}}>Manager: {currentUser.manager}</span>}
              {isPeopleManager && <span style={{fontSize:10,padding:'4px 12px',borderRadius:20,background:'rgba(168,85,247,0.1)',color:'#a855f7'}}>Vue actuelle: {currentViewLabel}</span>}
            </div>
          </div>

          {/* Actions photo */}
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{...S.btn('back'),fontSize:11,padding:'6px 14px',cursor:'pointer',textAlign:'center'}}>
              Changer photo
              <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
            </label>
            {photo && <button style={{...S.btn('ghost'),fontSize:11,padding:'6px 14px',color:'#DC2626',borderColor:'rgba(239,68,68,0.3)'}} onClick={handleRemovePhoto}>Supprimer photo</button>}
          </div>
        </div>

        {/* Switch vue pour People Manager */}
        {isPeopleManager && (
          <div style={{...S.aiCard, marginBottom:22, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200}}>
              <div style={S.aiBadge}>People Manager</div>
              <div style={{fontSize:14,fontWeight:600,marginTop:8}}>Changer de vue sans se deconnecter</div>
              <div style={{fontSize:12,color:'#2d3748',marginTop:4}}>Vous etes actuellement en vue <strong style={{color:'#0070AD'}}>{currentViewLabel}</strong></div>
            </div>
            <button style={{
              padding:'14px 28px',
              fontSize:14,
              fontWeight:700,
              background: currentUser?.role === 'manager'
                ? 'linear-gradient(135deg,#0070ad,#00c4f0)'
                : 'linear-gradient(135deg,#b8860b,#ffd700)',
              color: currentUser?.role === 'manager' ? '#fff' : '#0a1628',
              border:'none',
              borderRadius:12,
              cursor:'pointer',
              fontFamily:'inherit',
              transition:'all .2s',
            }} onClick={() => onSwitchView(currentUser?.role === 'manager' ? 'consultant' : 'manager')}>
              Basculer vers vue {otherViewLabel}
            </button>
          </div>
        )}

        {/* Informations du compte */}
        <SectionTitle>Informations du compte</SectionTitle>
        <div style={{...S.card, marginBottom:22}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>NOM COMPLET</div>
              <div style={{fontSize:14,fontWeight:600}}>{currentUser?.name}</div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>EMAIL</div>
              <div style={{fontSize:14,fontWeight:600}}>{currentUser?.email}</div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>ROLE</div>
              <div style={{fontSize:14,fontWeight:600,color:badge.color}}>{badge.label}</div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>MANAGER</div>
              <div style={{fontSize:14,fontWeight:600}}>{currentUser?.manager || '-'}</div>
            </div>
            {currentUser?.suppliersCount > 0 && <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>FOURNISSEURS</div>
              <div style={{fontSize:14,fontWeight:600,color:'#0070AD'}}>{currentUser.suppliersCount}</div>
            </div>}
            {currentUser?.trips > 0 && <div>
              <div style={{fontSize:10,fontWeight:600,color:'#2d3748',marginBottom:4}}>TRIPS</div>
              <div style={{fontSize:14,fontWeight:600,color:'#0070AD'}}>{currentUser.trips}</div>
            </div>}
          </div>
        </div>

        {/* ═══ RESET DONNÉES DE TEST (Fatima Ezzahra Sakhi uniquement) ═══ */}
        {currentUser?.email?.toLowerCase() === 'fatimaezzahra.sakhi@capgemini.com' && (
          <>
            <SectionTitle>Espace de test</SectionTitle>
            <div style={{...S.card, marginBottom:22, padding:18, borderLeft:'4px solid #D97706'}}>
              <div style={{fontSize:13,fontWeight:600,color:'#000',marginBottom:6}}>Reinitialiser mes donnees de test</div>
              <div style={{fontSize:12,color:'#2d3748',marginBottom:12}}>
                Cette action supprimera <strong>toutes vos declarations</strong>, taches en cours et historique. Les autres utilisateurs ne sont pas affectes.
              </div>
              <button
                style={{...S.btn('accent'), background:'#DC2626', borderColor:'#DC2626'}}
                onClick={() => {
                  if (!window.confirm('Confirmer la suppression de TOUTES vos donnees de test ?')) return;
                  try {
                    const all = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
                    const others = all.filter(d => d.Consultant !== currentUser.name);
                    // Supprimer aussi du backend les declarations qui ont un _backend_id
                    const toDelete = all.filter(d => d.Consultant === currentUser.name && d._backend_id);
                    toDelete.forEach(d => deleteDeclarationFromBackend(d._backend_id));
                    localStorage.setItem('workload_declarations', JSON.stringify(others));
                    // Aussi nettoyer les affectations et overrides liés
                    const aff = JSON.parse(localStorage.getItem('workload_affectations') || '[]');
                    // Supprimer aussi du backend les affectations qui ont un _backend_id
                    const affToDelete = aff.filter(a => a.cos === currentUser.name && a._backend_id);
                    affToDelete.forEach(a => deleteAffectationFromBackend(a._backend_id));
                    localStorage.setItem('workload_affectations', JSON.stringify(aff.filter(a => a.cos !== currentUser.name)));
                    alert('Donnees de test supprimees ! Rafraichissez la page.');
                    window.location.reload();
                  } catch (err) {
                    alert('Erreur: ' + err.message);
                  }
                }}
              >
                Supprimer mes donnees de test
              </button>
            </div>
          </>
        )}

        {/* Changement mot de passe */}
        <SectionTitle>Changer le mot de passe</SectionTitle>
        <div style={{...S.card, padding:22}}>
          <div style={{display:'flex',flexDirection:'column',gap:14,maxWidth:400}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>MOT DE PASSE ACTUEL</div>
              <input style={S.input} type="password" placeholder="Votre mot de passe actuel" value={oldPwd} onChange={e=>{setOldPwd(e.target.value);setError('');}}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>NOUVEAU MOT DE PASSE</div>
              <input style={S.input} type="password" placeholder="Minimum 6 caracteres" value={newPwd} onChange={e=>{setNewPwd(e.target.value);setError('');}}/>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#2d3748',marginBottom:6}}>CONFIRMER</div>
              <input style={{
                ...S.input,
                border: confirmPwd && confirmPwd === newPwd ? '1px solid #16A34A' : confirmPwd && confirmPwd !== newPwd ? '1px solid #DC2626' : '1px solid #e2e8f0'
              }} type="password" placeholder="Retapez le nouveau mot de passe" value={confirmPwd} onChange={e=>{setConfirmPwd(e.target.value);setError('');}}/>
              {confirmPwd && confirmPwd === newPwd && <div style={{fontSize:10,color:'#16A34A',marginTop:4}}>✓ Correspondent</div>}
              {confirmPwd && confirmPwd !== newPwd && <div style={{fontSize:10,color:'#DC2626',marginTop:4}}>✕ Ne correspondent pas</div>}
            </div>

            {error && (
              <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:14}}>⚠</span>
                <span style={{fontSize:12,color:'#DC2626',fontWeight:500}}>{error}</span>
              </div>
            )}

            <button style={{
              ...S.btn('accent'),
              width:'fit-content',
              padding:'10px 24px',
              opacity: oldPwd && newPwd && confirmPwd && newPwd === confirmPwd ? 1 : 0.5,
            }} onClick={handleChangePassword}>
              Modifier le mot de passe
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// ═══ MAIN APP ═══
 function App() {
  const [loggedIn,setLoggedIn] = useState(false);
  const [role,setRole] = useState('manager');
  const [currentUser,setCurrentUser] = useState(null);
  const [screen,setScreen] = useState('manager');
  const [toast,setToast] = useState({show:false,msg:''});
  const [categories, setCategories] = useState(CATEGORIES);
  const [tasksMap, setTasksMap] = useState({});
  const [teamsData, setTeamsData] = useState([]);
  const [backendConsultants, setBackendConsultants] = useState([]);
  useEffect(() => {
    if (!currentUser) return;

    // Catégories
    api.listCategories()
      .then(data => {
        const formatted = data.map(c => ({
          cat: c.name,
          icon: c.icon || '',
          tasks: c.tasks.map(t => ({ name: t.name, dur: t.standard_duration_min })),
        }));
        // Construire le mapping nom de tache -> id backend (pour push declarations)
        const map = {};
        data.forEach(c => c.tasks.forEach(t => { map[t.name] = t.id; }));
        setTasksMap(map);
        localStorage.setItem('workload_tasks_map', JSON.stringify(map));
        setCategories(formatted);
      })
      .catch(err => console.warn('Catégories API échoué:', err.message));

    // Teams (avec arborescence complète)
    api.listTeams()
      .then(async teams => {
        const full = await Promise.all(teams.map(t => api.getTeam(t.id)));
        setTeamsData(full);
      })
      .catch(err => console.warn('Teams API échoué:', err.message));

    // Consultants à plat (pour les listes globales)
    api.listConsultants({ limit: 500 })
      .then(data => setBackendConsultants(data))
      .catch(err => console.warn('Consultants API échoué:', err.message));

   // Sync déclarations du backend vers localStorage
    syncDeclarationsFromBackend(currentUser);
    syncAffectationsFromBackend(currentUser);
  }, [currentUser]);
  const showToast = useCallback((msg) => {
    setToast({show:true,msg});
    setTimeout(()=>setToast({show:false,msg:''}),3000);
  },[]);

 const handleLogin = (user) => {
  // ═══ AUTO-RESET DES DONNÉES DE TEST DE FATIMA EZZAHRA SAKHI ═══
  // (s'execute une seule fois grace au flag workload_fatima_test_reset_v1)
  if (user?.email?.toLowerCase() === 'fatimaezzahra.sakhi@capgemini.com') {
    const resetFlag = localStorage.getItem('workload_fatima_test_reset_v1');
    if (!resetFlag) {
      try {
        // Purger les declarations de Fatima
        const all = JSON.parse(localStorage.getItem('workload_declarations') || '[]');
        const others = all.filter(d => d.Consultant !== user.name && d.Consultant !== 'Fatima Ezzahra Sakhi' && d.Consultant !== 'Fatimaezzahra Sakhi');
        localStorage.setItem('workload_declarations', JSON.stringify(others));
        // Purger les affectations de Fatima
        const aff = JSON.parse(localStorage.getItem('workload_affectations') || '[]');
        localStorage.setItem('workload_affectations', JSON.stringify(aff.filter(a => a.cos !== user.name && a.cos !== 'Fatima Ezzahra Sakhi' && a.cos !== 'Fatimaezzahra Sakhi')));
        // Marquer le reset comme fait
        localStorage.setItem('workload_fatima_test_reset_v1', new Date().toISOString());
        console.log('[WorkloadGeo] Donnees de test de Fatima Ezzahra Sakhi reinitialisees automatiquement.');
      } catch (e) {
        console.warn('[WorkloadGeo] Erreur lors du reset auto:', e);
      }
    }
  }
  setRole(user.role);
  setCurrentUser(user);
  setLoggedIn(true);
  setScreen(user.role === 'manager' ? 'manager' : 'workload');
};
const handleSwitchView = (newRole) => {
  setRole(newRole);
  setCurrentUser(prev => ({ ...prev, role: newRole }));
  setScreen(newRole === 'manager' ? 'manager' : 'workload');
};
  if(!loggedIn) return <LoginScreen onLogin={handleLogin}/>;

 const cosNav = [
    {id:'workload',label:'Declarer ma journee'},
    {id:'history',label:'Mon Workload'},
    {id:'previsions',label:'Previsions'},
    {id:'ongoing',label:'Ongoing Workload'},
    {id:'powerbi',label:'Power BI'},
    {id:'reco',label:'Recommandations'},
    {id:'geo',label:'Mapping'},
    {id:'profil',label:'Mon Profil'},
  ];
  const mgrNav = [
    {id:'manager',label:'Vue Equipe & KPIs'},
    {id:'powerbi',label:'Power BI'},
    {id:'profil',label:'Mon Profil'},
  ];
  const navItems = role==='consultant'?cosNav:mgrNav;

  return (
    <div style={S.app}>
      <aside style={S.sidebar}>
        <div style={S.logo}><div style={S.logoBrand}>Capgemini Engineering</div><div style={S.logoTitle}>WorkloadGeo</div><img src="/ logo-capgemini.png
" alt="" style={{height:24,marginTop:4}} onError={(e)=>{e.target.style.display='none'}} /></div>
        <div style={S.section}><div style={S.sectionLabel}>{role==='manager'?'Management':'Workload'}</div>
          {navItems.slice(0,role==='consultant'?4:1).map(n=><div key={n.id} style={S.navItem(screen===n.id)} onClick={()=>setScreen(n.id)}>{n.label}</div>)}
        </div>
        <div style={S.section}><div style={S.sectionLabel}>Analytique</div>
          <div style={S.navItem(screen==='powerbi')} onClick={()=>setScreen('powerbi')}>Power BI</div>
        </div>
        {role==='consultant'&&<div style={S.section}><div style={S.sectionLabel}>Geolocalisation</div>
          <div style={S.navItem(screen==='geo')} onClick={()=>setScreen('geo')}>Mapping</div>
        </div>}
        {role==='consultant'&&<div style={S.section}><div style={S.sectionLabel}>Feedback</div>
          <div style={S.navItem(screen==='reco')} onClick={()=>setScreen('reco')}>Recommandations</div>
        </div>}
        <div style={S.section}><div style={S.sectionLabel}>Compte</div>
  <div style={S.navItem(screen==='profil')} onClick={()=>setScreen('profil')}>Mon Profil</div>
</div>
       <div style={S.userBar}>
  <div style={S.avatar}>{currentUser?getInitials(currentUser.name):role==='manager'?'AM':'AE'}</div>
  <div><div style={{fontSize:12,fontWeight:600}}>{currentUser?currentUser.name:'Utilisateur'}</div><div style={{fontSize:10,color:'#2d3748',textTransform:'capitalize'}}>{role}{currentUser?.originalRole==='people_manager'?' (PM)':''}{currentUser?.manager?` · ${currentUser.manager}`:''}</div></div>
  <div style={{marginLeft:'auto',cursor:'pointer',color:'#2d3748',fontSize:10,background:'#ffffff',border:'1px solid #e2e8f0',borderRadius:6,padding:'3px 8px'}} onClick={()=>{setLoggedIn(false);setCurrentUser(null);}}>Deconnexion</div>
</div>
      </aside>
      <main style={S.main}>
{screen==='manager'&&<ManagerView showToast={showToast} currentUser={currentUser}/>}        {screen==='workload'&&<DeclarerView showToast={showToast} currentUser={currentUser}/>}
        {screen==='history'&&<MonWorkload currentUser={currentUser}/>}
{screen==='previsions'&&<PrevisionsView showToast={showToast} currentUser={currentUser}/>}
       {screen==='ongoing'&&<OngoingView showToast={showToast} currentUser={currentUser}/>}
        {screen==='reco'&&<RecoView showToast={showToast}/>}
        {screen==='geo'&&<GeoView showToast={showToast} currentUser={currentUser}/>}
        {screen==='powerbi'&&<PowerBIView/>}
        {screen==='profil'&&<ProfilView currentUser={currentUser} showToast={showToast} onSwitchView={handleSwitchView}/>}
      </main>
      <Toast msg={toast.msg} show={toast.show}/>
    </div>
  );
}

export default App;
