import React, { useMemo, useState } from 'react';

const publicImage = (fileName) => `${process.env.PUBLIC_URL}/Images/${fileName}`;

const ruleSections = [
  {
    id: 'general',
    title: 'Általános szabályok',
    fileName: 'altalanos-szabalyok.doc',
    content: [
      {
        title: '1. A szabályzat célja',
        text: [
          'Jelen szabályzat célja, hogy biztosítsa a verseny tisztaságát, az esélyegyenlőséget és a sportszerű lebonyolítást. A szabályzat minden résztvevő csapatra, felkészítőre és versenybíróra egyaránt kötelező érvényű.',
          'A versenyre történő nevezéssel minden csapat elfogadja a jelen szabályzatban foglaltakat.',
          'A szabályzat nem ismerete semmilyen esetben sem mentesít a szabályok betartása alól.'
        ]
      },
      {
        title: '2.1 Résztvevők',
        text: [
          'A versenyen kizárólag általános- és középiskolás diákok vehetnek részt.',
          'Egy csapat 2 versenyzőből áll, és 1 felkészítő tanár vagy mentor tartozik hozzá.',
          'A nevezést követően a csapat összetétele kizárólag a szervezők engedélyével módosítható, miután a csapat e-mailben felvette a kapcsolatot a szervezőkkel.'
        ]
      },
      {
        title: '2.2 Regisztráció',
        text: [
          'A csapatok kötelesek a verseny napján a meghatározott időpontban regisztrálni.',
          'A regisztráció során ellenőrizzük a csapat nevét, a versenyzők személyazonosságát, a robotot, a nevezési adatokat, valamint a szükséges nyilatkozatokat és dokumentumokat.'
        ]
      },
      {
        title: '2.3 Versenybeosztás',
        text: [
          'A verseny napján minden csapat megtekintheti saját időbeosztását a verseny hivatalos weboldalán.',
          'A beosztás a regisztrált felhasználói fiókkal, illetve a nevezés során megadott e-mail-címmel történő bejelentkezést követően tekinthető meg.',
          'A csapatok kötelesek figyelemmel követni saját időpontjaikat. A szervezők nem vállalnak felelősséget azért, ha egy csapat elmulasztja saját versenyidőpontját.'
        ]
      },
      {
        title: '2.4 Késés',
        text: [
          'A csapatnak a kiírt időpont előtt meg kell jelennie a versenypályán.',
          'Ha a csapat nem jelenik meg, elkésik, vagy nem áll készen a verseny megkezdésére, az adott versenyszámban automatikusan 0 pontot kap.',
          'Utólagos újrafutásra vagy javításra nincs lehetőség.'
        ]
      },
      {
        title: '2.5 Csapatasztalok',
        text: [
          'A szervezők minden csapat számára külön munkaasztalt biztosítanak.',
          'Az asztal használható a robot szerelésére és programozására, az akkumulátorok töltésére, valamint a szerszámok és felszerelések tárolására.',
          'A csapatok kötelesek saját területüket tisztán tartani, és a többi csapat területét tiszteletben tartani.'
        ]
      },
      {
        title: '3.1 Megengedett alkatrészek',
        text: [
          'A robot kizárólag eredeti LEGO® alkatrészekből épülhet.',
          'Megengedettek például a LEGO Technic elemek, a LEGO SPIKE Prime és LEGO Mindstorms alkatrészek, a hivatalos LEGO motorok, érzékelők és kábelek, az eredeti LEGO akkumulátor, valamint bármilyen más eredeti LEGO alkatrész vagy elem.',
          'Nem megengedettek a 3D nyomtatott elemek, az utángyártott LEGO-kompatibilis elemek, a fém alkatrészek, a ragasztás, a csavarozás, a forrasztás, a nem LEGO elemből készült gumiszalagos rögzítés és bármilyen más, nem LEGO szerkezeti elem.'
        ]
      },
      {
        title: '3.2 A robot mérete',
        text: [
          'A robot maximális mérete 30 × 30 × 30 cm.',
          'A méretellenőrzés minden versenyszám előtt megtörténhet. A robotnak egy felül nyitott, 30 × 30 × 30 cm-es ellenőrződobozba minden erőltetés nélkül bele kell férnie. A doboz leemelése után sem lóghat túl semmi a megadott határokon.',
          'A mérés során minden felszerelt elem, minden kinyúló rész – például kábel – és minden felszerelt tartozék beleszámít a robot méretébe.'
        ]
      },
      {
        title: '3.3 A mérethatár túllépése',
        text: [
          'Ha a robot nem fér bele az ellenőrződobozba, a csapat lehetőséget kap a helyszíni módosításra. A módosítást még a futam megkezdése előtt el kell végezni.',
          'Ha a robot ezt követően sem felel meg az előírásoknak, a csapat az adott versenyszámban 0 pontot kap.'
        ]
      },
      {
        title: '3.4 A robot módosítása',
        text: [
          'A csapatok a versenyszámok között átépíthetik, módosíthatják, újraprogramozhatják vagy javíthatják a robotjukat.',
          'A robotnak minden versenyszám előtt ismét meg kell felelnie az összes műszaki előírásnak.'
        ]
      },
      {
        title: '3.5 Robotok cseréje',
        text: [
          'Egy csapat kizárólag egy központi egységet (bricket) használhat.'
        ]
      },
      {
        title: '4. A versenyszámok',
        text: [
          'A verseny több különálló versenyszámból áll. Minden versenyszám saját feladatszabályzattal rendelkezik.',
          'Az adott feladatszabályzat kiegészíti, de nem írja felül a jelen általános szabályzatot.'
        ]
      },
      {
        title: '5. A futamok lebonyolítása',
        text: [
          'A futam kezdetét és végét kizárólag a versenybíró jelzi.',
          'A futam során a csapat kizárólag a feladatszabályzatban megengedett módon érhet hozzá a robothoz.',
          'Ha a feladatszabályzat nem engedélyezi a robot megfogását, áthelyezését, javítását vagy újraindítását, ezek tilosnak minősülnek.'
        ]
      },
      {
        title: '6. Bíráskodás',
        text: [
          'A verseny során a pályán tartózkodó versenybíró döntése minden futamra nézve végleges.',
          'A versenyszámok alatt videóbíró nem működik, és videófelvétel alapján utólagos óvás nem nyújtható be.',
          'A bíró jogosult figyelmeztetni, megállítani vagy érvényteleníteni a futamot, illetve 0 pontot megállapítani.'
        ]
      },
      {
        title: '7. Pontozás',
        text: [
          'Minden versenyszám saját pontozási rendszerrel rendelkezik.',
          'A végső eredményt a versenyszámok során szerzett pontok összege adja.'
        ]
      },
      {
        title: '8. Sportszerűség',
        text: [
          'Minden résztvevő köteles tisztelettel viselkedni, elfogadni a bíró döntését, nem zavarni más csapatokat, és a verseny eszközeit rendeltetésszerűen használni.',
          'Tilos más csapat robotjához hozzáérni; más csapat programját vagy felszerelését annak engedélye nélkül használni; a pályát szándékosan módosítani; valamint más csapat munkáját akadályozni.'
        ]
      },
      {
        title: '9. Biztonsági szabályok',
        text: [
          'A versenyzők kötelesek ügyelni saját és mások testi épségére, rendben tartani a munkaasztalukat, megfelelően kezelni az elektromos eszközöket, és az akkumulátorokat kizárólag rendeltetésszerűen használni.',
          'A szervezők jogosultak megtiltani bármely balesetveszélyes eszköz használatát.'
        ]
      },
      {
        title: '10. Kizárás',
        text: [
          'A szervezők jogosultak kizárni egy csapatot különösen szándékos csalás, tiltott alkatrész használata, hamis nevezési adatok, a bíró döntésének ismételt figyelmen kívül hagyása, sportszerűtlen viselkedés, más csapat szándékos akadályozása vagy a verseny szándékos megzavarása esetén.',
          'A kizárásról a verseny főbírója vagy szervezője dönt.'
        ]
      },
      {
        title: '11. Óvás',
        text: [
          'Ha a versenyszám szabályzata másként nem rendelkezik, a csapatok a futam eredménye ellen nem nyújthatnak be óvást.',
          'A bíró helyszíni döntése végleges. A döntés meghozatalához kérhető a szervezők segítsége.'
        ]
      },
      {
        title: '12. Adatkezelés és média',
        text: [
          'A versenyen fénykép- és videófelvételek készülhetnek.',
          'A nevezéssel a résztvevők hozzájárulnak ahhoz, hogy a szervezők a felvételeket a verseny dokumentálására, a hivatalos weboldalon, közösségimédia-felületeken, valamint a következő évek versenyeinek népszerűsítésére felhasználják.'
        ]
      },
      {
        title: '13. Záró rendelkezések',
        text: [
          'A szervezők fenntartják a jogot a szabályzat módosítására, ha ezt a verseny biztonságos vagy igazságos lebonyolítása indokolja. A módosításról a csapatokat e-mailben értesíteni kell.',
          'A szabályzatban nem rendezett kérdésekben a verseny szervezőjének vagy főbírójának döntése az irányadó.',
          'A nevezéssel minden résztvevő kijelenti, hogy a jelen szabályzatot elolvasta, megértette, és magára nézve kötelezőnek fogadja el.'
        ]
      }
    ]
  },
  {
    id: 'category-1',
    title: 'Szumó',
    fileName: 'szumo.doc',
    content: [
      {
        title: 'Leírás',
        text: [
          'A szumó versenyszámban két robot vív egymással csatát egy körpályán. Az a robot nyer, amelyik hamarabb letolja a másikat a pályáról. A csapatok bármilyen, a szabályok által nem tiltott mozgó alkatrészt, kart, emelőt, szenzort vagy más megoldást használhatnak.'
        ]
      },
      {
        title: 'Egy menet lefolyása',
        text: [
          'A robotok egymásnak háttal, párhuzamosan kezdik a meccset a pálya közepén. A robotokat egy vonalhoz vagy a pályára merőlegesen helyezett falaphoz kell igazítani úgy, hogy falap hiányában egyik részük se lógjon túl a vonalon, megfelelő pozícióban legyenek, és ne zavarják egymást. A két vonal között 10 cm távolság van.',
          'A versenyzők a 3 másodperces visszaszámlálás után, zöld jelzésre indítják el a robotokat. A gyakorláshoz szükséges indítójelzés az oldalunkon is megtalálható. A robotoknak a meccs elején egymással ellentétes irányba kell elindulniuk, és el kell jutniuk a pálya szélét jelző fehér sávig.',
          'A robotot elindító diákoknak az indítás után le kell ülniük a kijelölt székre, hogy ne zavarják a bírót és a robotokat. Döntetlen helyzetben a csapattagok kézfeltartással jelezhetik, hogy a kör újrajátszását kérik az órán megmaradt idővel.',
          'Egy meccs legfeljebb 45 másodpercig tart. Egy páros pontosan 3, közvetlenül egymás után következő fordulót játszik.',
          'A robot akkor nyeri meg a meccset, ha az ellenfél robotja leér a pályáról és megérinti a földet. Döntetlen az eredmény, ha az idő lejártakor mindkét robot a pályán marad.'
        ]
      },
      {
        title: 'Részletes szabályok',
        text: [
          'Ha egy robot 5 másodpercen belül nem indul el, rossz irányba indul, vagy nem jut el a pálya széléig, az első alkalommal figyelmeztetést kap. Minden további ilyen alkalommal vesztesnek nyilvánítjuk az adott meccsen.',
          'A robot akkor is veszít, ha a csapat versenyzője figyelmeztetés után beleavatkozik a menetbe, ha a robot nagyobb a megengedett méretnél, vagy ha a csapat bármilyen okból nem jelenik meg.',
          'Ha a robot ütközés vagy más ok miatt elveszít egy alkatrészt, de továbbra is működőképes és versenyképes, a meccs befejezhető. Ha a versenyző úgy ítéli meg, hogy ez kárt okozhat a robotban, jelezheti a meccs feladását.',
          'Minden meccs után ép állapotban kell a robotot a rajthelyre tenni. Erre a csapattagok legfeljebb 30 másodpercet kapnak, és a robotot nem vihetik el a pálya mellől.',
          'Ha a robot leesik a pályáról, elveszíti a meccset.',
          'Ha a két robot egyszerre esik le, és nem állapítható meg egyértelműen, melyik ért előbb földet, a meccs döntetlen.',
          'A meccs döntetlen, ha lejár az idő, és mindkét robot a pályán marad.',
          'Ha egy robot lemerül vagy leáll a menet közben, a meccs az idő lejártáig, illetve addig folytatódik, amíg az érintett versenyző nem jelzi a feladást. A hibát a két meccs között kell megoldani, vagy a játékos – ha még nem használta fel – időt kérhet.',
          'A bírói meccsvéget jelző vízszintes kézfeltartás és szóbeli jelzés után történtek már nem értékelhetők. A versenyzők ekkor felállnak, megállítják a robotokat, és felkészülnek a következő meccsre.'
        ]
      },
      {
        title: 'Időkérés',
        text: [
          'Minden fordulóban csapatonként egyszer kérhető idő. Az időkérés legfeljebb 30 másodpercig tarthat, és a meccsek közötti, legfeljebb félperces szünetben kérhető.',
          'Az időkérés alatt programozáson kívül bármilyen módosítás elvégezhető a roboton, amennyiben annak mérete továbbra is megfelel a szabályoknak. A robothoz csak a versenyterületen tartózkodó versenyző érhet hozzá, és a robot nem vihető ki innen.',
          'A 30 másodperc leteltével a robotot a pályára kell helyezni. Ha ez nem történik meg, a csapat 0–3 arányban elveszíti a mérkőzést.'
        ]
      },
      {
        type: 'table',
        title: 'Pontozás',
        rows: [
          ['Eredmény', 'Pontszám'],
          ['Győzelem', '2 pont'],
          ['Döntetlen', '1 pont'],
          ['Vereség', '0 pont']
        ]
      },
      {
        title: 'A pálya és a zóna',
        text: [
          'A szumó versenyszám egy x cm sugarú, 5 cm magas, matt felületű, bútorlapból kivágott körön zajlik. A pálya feketére festett, a szélén x cm vastag fehér körvonallal. A pálya méretei még nem véglegesek.',
          'A csapatok csoportkörös rendszerben versenyeznek. Minden csapat 3 másik csapat ellen játszik, és csoportonként a legjobb x csapat jut tovább.',
          'A mérkőzések zónájába csapatonként egy versenyző léphet be. A másik csapattag és a felkészítő tanárok a zónán kívülről követhetik a mérkőzéseket.'
        ]
      },
      {
        type: 'image',
        title: 'A szumópálya',
        src: publicImage('SzumoPalya.png'),
        alt: 'A szumópálya tájékoztató ábrája'
      },
      {
        title: 'Megjegyzés az ábrához',
        text: [
          'A kép csak illusztráció, nem méretarányos, és kizárólag tájékoztató jellegű. A kék feliratok nem lesznek rajta a fizikai pályán, a középső jelölők azonban igen. A méretek még nem véglegesek.'
        ]
      }
    ]
  },
  {
    id: 'category-2',
    title: 'Vonalkövetés',
    fileName: 'vonalkovetes.doc',
    content: [
      {
        title: 'Általános leírás',
        text: [
          'A vonalkövetés versenyszámban a csapatoknak egy előre meghatározott körpályán, a vonal mentén kell végighaladniuk. A pálya vonalai sehol sem keresztezik egymást.',
          'Az egyenes szakaszok előtt és után a követendő vonal színétől egyértelműen megkülönböztethető piros jelzés található. Ez segíthet az egyenes szakaszok érzékelésében, de használata nem kötelező.',
          'Egy próbára legfeljebb 2 perc áll rendelkezésre. A csoportkörben minden csapat legfeljebb kétszer, az egyenes kieséses szakaszban legfeljebb egyszer próbálkozhat. A csoportkörben a két próbálkozás közül csak a jobb idő számít.'
        ]
      },
      {
        title: 'Egy kör leírása',
        text: [
          'A versenyző a robotot a rajtterületre helyezi, majd a bíró engedélye után elindítja. A robotnak önállóan, külső beavatkozás nélkül kell egyszer körbemennie a kijelölt pályán.',
          'A próbálkozások között a robot szabadon módosítható.',
          'Ha a robot elhagyja a vonalat, és a versenyző úgy ítéli meg, hogy nem talál vissza rá, visszateheti arra a pontra, ahol elveszítette a vonalat. Minden ilyen visszahelyezésért 5 másodperc büntetés jár, amelyet hozzáadunk a mért időhöz.',
          'Egy körben tetszőleges számú visszahelyezés lehetséges. Ha a robot a visszahelyezés után nem találja meg a vonalat, és a versenyző ismét hozzáér kizárólag a megfelelő beállítás érdekében, ezért nem jár újabb büntetés.'
        ]
      },
      {
        title: 'A pálya',
        text: [
          'A pálya egy 2 × 3 méteres, fehér alapú anyag, amelyen fekete színű követendő vonal található. Az egyenes szakaszok elején és végén a követendő vonaltól eltérő, piros jelzés helyezkedik el. A vonalak nem keresztezik egymást.',
          'Az időmérés fotocellás kapuval történik. A pálya a teljes verseny alatt rögzítve marad. A pályára cipővel lépni tilos.'
        ]
      },
      {
        type: 'image',
        title: 'A vonalkövető pálya',
        src: publicImage('vonalkovetesWeboldalnezet.png'),
        alt: 'A vonalkövető pálya ábrája'
      },
      {
        title: 'Lehetséges esetek',
        text: [
          'A robot nem indul el.',
          'A robot rossz irányba indul.',
          'A robot elhagyja a pályát.',
          'A robot a pálya elhagyásával levág egy kanyart.',
          'Két csapat azonos időt ér el.',
          'A robot megáll a pályán, és nem halad tovább.'
        ]
      },
      {
        title: 'Részletes szabálykönyv',
        text: [
          'Próbálkozásnak tekintünk minden olyan esetet, amelyben a robot a fotocellás kapun áthaladva elindítja az időmérést.',
          'A próbálkozás akkor ér véget, amikor a robot menetirány szerint áthalad a fotocellás kapun és leállítja az időmérést, vagy amikor lejár a legfeljebb 2 perces időkeret.',
          'Ha a csapat úgy ítéli meg, hogy a robot nem tud körbeérni, feladhatja a próbálkozást. Ekkor teljesített időként a maximum 2 percet kapja.',
          'Ha a robot futó időmérés közben elhagyja a pályát, vagy rossz irányban kezdi követni a vonalat, a versenyző kézzel visszahelyezheti a pályára. Ez 5 másodperces büntetéssel jár.',
          'Ha a felügyelő bíró szerint a robot rossz helyre került vissza, kérheti annak helyes pozícióba állítását. Ezért nem jár újabb 5 másodperces büntetés. Ha a versenyző a bíró kérése ellenére nem helyezi vissza megfelelően a robotot, és tovább folytatja a vonalkövetést, a próbálkozás nem értékelhető, és a kétperces maximumidőt kell beírni.',
          'Ha a robot a pálya elhagyásával levág egy kanyart, kötelező visszahelyezni a vonal azon pontjára, ahol még szabályosan követte azt. Ellenkező esetben a próbálkozás nem értékelhető, és a kétperces maximumidőt kell beírni.',
          'Ha a robot a próbálkozás közben megáll vagy mozgásképtelenné válik, a próbálkozás nem értékelhető, és a kétperces maximumidőt kell beírni.',
          'Ha a robot futását a csapattól független külső tényező befolyásolja, a próbálkozás a versenyző kérésére szabadon megismételhető. A robot ebben az esetben nem módosítható, és az ismétlést azonnal el kell indítani.'
        ]
      }
    ]
  },
  {
    id: 'category-3',
    title: 'Kosárra dobás',
    fileName: 'kosarra-dobas.doc',
    content: [
      {
        title: 'Általános leírás',
        text: [
          'A kosárra dobás versenyszámban a csapatoknak 5, változó távolságra lévő kosárra kell dobniuk hagyományos pingponglabdával.',
          'Minden csapatnak 2 perc áll rendelkezésére, és ezen belül legfeljebb 5-ször dobhat. A csapatnak a kijelölt zónából kell dobnia, ezen belül bárhova helyezheti a robotot.',
          'A robotnak helyváltoztatásra alkalmasnak kell lennie, és minden dobás előtt és után valamilyen egyértelműen meghatározható helyváltoztató mozgást kell végeznie.',
          'A csapatok kétszer próbálkozhatnak. A próbák között a robot szabadon módosítható.'
        ]
      },
      {
        title: 'Egy próbálkozás menete',
        text: [
          'A próbálkozás a visszaszámlálás után, zöld jelzésre indul. Ezután a csapatnak 2 perc áll rendelkezésére a pontszerzésre.',
          'Egy csapat legfeljebb 5-ször dobhat akkor is, ha az idő még nem telt le.',
          'A csapat akkor szerez pontot egy dobással, ha a labda a kosárba érkezik, és benne is marad.'
        ]
      },
      {
        title: 'A pálya',
        text: [
          'A pálya alapterülete 150 × 75 centiméter. A dobóterület 75 × 75 centiméter, a kosarakat tartalmazó pontszerző terület pedig szintén 75 × 75 centiméter.',
          'A kosarak a mellékelt építési útmutató alapján szabadon megépíthetők. Az előre meghatározott távolságokon véletlenszerűen helyezzük el és stabilan rögzítjük őket.',
          'A kosarak csak felülről nyitottak. Mögöttük egy hozzájuk rögzített, szabadon használható palánk található. A kosarak magassága x centiméter.',
          'A kosarak dobóterülettől mért távolsága: 20 cm, 35 cm, 50 cm, 60 cm és 70 cm.'
        ]
      },
      {
        type: 'image',
        title: 'A kosárra dobás pályája',
        src: publicImage('kosarradobas.png'),
        alt: 'A kosárra dobás pályájának ábrája'
      },
      {
        title: 'Részletes szabálykönyv',
        text: [
          'Egy próbálkozás a zöld jelzés után indul.',
          'A próbálkozás akkor ér véget, amikor a csapat elérte az 5 szabályos dobást, vagy lejárt a 2 perc.',
          'Egy dobás akkor érvényes, ha a robot a dobás előtt és után is helyváltoztató mozgást végzett; a labda a robot által hagyta el a dobóterületet; továbbá a robot minden része végig a dobóterületen belül maradt.',
          'Amint a labda elhagyja a dobóterületet, a dobás elvégzettnek tekintendő. Ha a robot teljesítette az érvényesség minden feltételét, a dobás értékelhető. Ellenkező esetben nem értékelhető.',
          'Ha a labda mozgás közben leesik a robotról, de a dobóterületen belül marad, a dobás újrakezdhető.',
          'Ha a labda egy csapattag miatt kerül a dobóterületen kívülre, onnan visszavehető.',
          'Ha nem a robot ér utoljára a labdához, de az egyébként szabályos pontot szerez, a dobás nem értékelhető.',
          'A roboton a próbálkozás 2 perce alatt bármilyen módosítás elvégezhető, beleértve a program módosítását is.',
          'Ha egy csapattag azután ér a robothoz, hogy az már bármilyen mozgást végzett, és a robot ezt követően érvényes dobást hajt végre, a dobás nem értékelhető.',
          'A próbálkozás közben a bírói jelzések után történtek nem értékelhetők.',
          'A robot a 2 percen belül bármikor elindítható. Ha az idő lejártakor már elvégezte a dobás előtti mozgást, a dobás még értékelhető, de hiba esetén nem ismételhető meg.',
          'A 2 perc lejártával a próbálkozást be kell fejezni; minden ezután történő esemény nem értékelhető.'
        ]
      }
    ]
  },
  {
    id: 'category-4',
    title: 'Hegymászás',
    fileName: 'hegymaszas.doc',
    content: [
      {
        title: 'Általános leírás',
        text: [
          'A hegymászó versenyszámban a robot feladata különböző meredekségű emelkedők önálló megmászása. A pálya négy különböző nehézségi szintből áll, amelyek a verseny teljes ideje alatt egyszerre elérhetők.',
          'A csapatoknak a szinteket sorrendben kell teljesíteniük. Magasabb nehézségű emelkedő csak az előző szint sikeres teljesítése után kezdhető meg.',
          'Az eredmény meghatározásánál elsődlegesen a sikeresen teljesített nehézségi szintek száma számít. Azonos szintszám esetén a teljesítéshez szükséges összesített idő dönt.',
          'Minden csapat egy próbálkozási lehetőséget kap.'
        ]
      },
      {
        title: 'Egy próbálkozás leírása',
        text: [
          'A versenyző a robotot az első emelkedő rajtvonalára helyezi. A visszaszámlálást követően, a rajtjelzés után indíthatja el. A robotnak önállóan, külső beavatkozás nélkül kell teljesítenie az emelkedőket.',
          'Egy emelkedő akkor tekinthető sikeresen teljesítettnek, ha a robot eléri az emelkedő tetején lévő célvonalat.',
          'Sikeres teljesítés után a robot a következő nehézségi szint rajtvonalára helyezhető. Ha a robot nem teljesíti az adott emelkedőt, a próbálkozás véget ér, és az addig sikeresen teljesített szintek kerülnek értékelésre.'
        ]
      },
      {
        title: 'A pálya',
        text: [
          'A pálya négy különböző nehézségű emelkedőből áll. Minden emelkedő 75 cm széles és 250 cm hosszú.',
          'Az egyes nehézségi szinteken a megadott maximális értékeknél kisebb meredekségű emelkedők is előfordulhatnak.',
          'Az időmérés elektronikus időmérő rendszerrel történik.'
        ]
      },
      {
        type: 'table',
        title: 'Nehézségi szintek',
        rows: [
          ['Szint', 'Maximális emelkedő'],
          ['1.', '63 cm magas (≈14°)'],
          ['2.', '96 cm magas (≈22°)'],
          ['3.', '150 cm magas (≈30°)'],
          ['4.', '150 cm magas (≈40°)']
        ]
      },
      {
        title: 'Lehetséges esetek',
        text: [
          'A robot nem indul el.',
          'A robot visszagurul az emelkedőn.',
          'A robot letér az emelkedőről.',
          'A robot megáll az emelkedőn.',
          'A robot felborul.',
          'Két csapat azonos számú szintet teljesít.',
          'A robot külső segítséget igényel.'
        ]
      },
      {
        title: 'Részletes szabálykönyv',
        text: [
          'Próbálkozásnak tekintünk minden olyan esetet, amikor a robot a rajtjelzés után megkezdi a mozgást.',
          'A csapat versenye véget ér, ha a robot nem tudja teljesíteni az aktuális emelkedőt, leesik az emelkedőről, felborul, mozgásképtelenné válik, vagy sikeresen teljesíti a negyedik nehézségi szintet.',
          'Ha a robot letér az emelkedőről vagy leesik róla, a próbálkozás véget ér. A robot nem helyezhető vissza a pályára, és nem folytathatja az adott próbálkozást.',
          'Ha a robot megáll, és önerőből nem képes továbbhaladni, a próbálkozás nem folytatható.',
          'Ha a versenyző a próbálkozás alatt a robot bármely részéhez hozzáér, a próbálkozás befejezettnek tekintendő.',
          'Ha a próbálkozás alatt a robothoz a csapaton kívüli személy ér hozzá, a próbálkozást meg kell ismételni.',
          'Ha a robot működését a csapattól független külső tényező – például pályahiba, időmérési hiba vagy külső fizikai behatás – befolyásolja, a próbálkozás a versenyző kérésére megismételhető.'
        ]
      },
      {
        title: 'Értékelés',
        text: [
          'A rangsort először a sikeresen teljesített nehézségi szintek száma, majd az összesített teljesítési idő határozza meg.',
          'Ha két vagy több csapat azonos számú szintet teljesít, a rövidebb időt elérő csapat kerül előrébb.'
        ]
      }
    ]
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildContentHtml(content) {
  return content.map((item) => {
    if (item.type === 'table') {
      const rows = item.rows.map((row, rowIndex) => {
        const tag = rowIndex === 0 ? 'th' : 'td';
        return `<tr>${row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join('')}</tr>`;
      }).join('');
      return `<section><h3>${escapeHtml(item.title)}</h3><table>${rows}</table></section>`;
    }

    if (item.type === 'image') {
      return `<section>
        <h3>${escapeHtml(item.title)}</h3>
        <a href="${escapeHtml(item.src)}" target="_blank" rel="noreferrer">
          <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || '')}" />
        </a>
        <p><em>Az ábra csak illusztráció, nem méretarányos, és kizárólag tájékoztató jellegű.</em></p>
      </section>`;
    }

    return `<section><h3>${escapeHtml(item.title)}</h3>${item.text.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`;
  }).join('');
}

function renderContentItems(content, sectionId) {
  return content.map((item, index) => {
    const key = `${sectionId}-${index}`;

    if (item.type === 'table') {
      return (
        <div key={key} className="mb-4">
          <p className="fw-bold fs-5 mb-2">{item.title}</p>
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <tbody>
                {item.rows.map((row, rowIndex) => (
                  <tr key={`${key}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => {
                      const Cell = rowIndex === 0 ? 'th' : 'td';
                      return <Cell key={`${key}-${rowIndex}-${cellIndex}`} className={rowIndex === 0 ? 'table-light' : ''}>{cell}</Cell>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (item.type === 'image') {
      return (
        <div key={key} className="mb-4">
          <p className="fw-bold fs-5 mb-2">{item.title}</p>
          <div className="rules-image-preview border rounded p-2 bg-light">
            <a
              href={item.src}
              target="_blank"
              rel="noreferrer"
              title="Kép megnyitása teljes méretben"
              aria-label={`${item.title} megnyitása teljes méretben`}
              className="d-block"
            >
              <img src={item.src} alt={item.alt || ''} className="img-fluid d-block mx-auto" />
            </a>
          </div>
          <p className="small text-muted fst-italic mt-2 mb-0">
            Az ábra csak illusztráció, nem méretarányos, és kizárólag tájékoztató jellegű. Kattints a képre a teljes méretű megtekintéshez.
          </p>
        </div>
      );
    }

    return (
      <div key={key} className="mb-3">
        <p className="fw-bold fs-5 mb-2">{item.title}</p>
        {item.text.map((paragraph, paragraphIndex) => (
          <p key={`${key}-${paragraphIndex}`} className="mb-2">{paragraph}</p>
        ))}
      </div>
    );
  });
}

function buildDocument(section) {
  return `<!DOCTYPE html>
<html lang="hu">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(section.title)}</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; color: #111; }
      .page { max-width: 178mm; margin: 0 auto; padding: 16mm; }
      h1 { font-size: 18pt; } h3 { font-size: 13pt; margin: 7mm 0 2mm; }
      p, td, th { font-size: 11pt; line-height: 1.5; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #f4f4f4; }
      img { display: block; max-width: 100%; max-height: 150mm; margin: 3mm auto; }
      .meta, .footer { color: #666; font-size: 9pt; }
      .footer { margin-top: 10mm; }
    </style>
  </head>
  <body><div class="page">
    <div class="meta">Lego Robotverseny • Szabályzat</div>
    <h1>${escapeHtml(section.title)}</h1>
    ${buildContentHtml(section.content)}
    <div class="footer">A szabályok nem ismerete nem mentesít azok betartása alól.</div>
  </div></body>
</html>`;
}

function downloadDocFile(filename, content) {
  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function RulesPage() {
  const [openSectionId, setOpenSectionId] = useState(null);
  const allSections = useMemo(() => ruleSections, []);

  const handleDownloadAll = () => {
    const combinedSection = {
      title: 'Összes szabályzati rész',
      content: allSections.flatMap((section) => [
        { title: section.title, text: [] },
        ...section.content
      ])
    };
    downloadDocFile('szabalyzat-osszes.doc', buildDocument(combinedSection));
  };

  return (
    <main className="rules-page">
      <section className="container py-4 py-md-5">
        <div className="home-panel rules-panel">
          <span className="home-kicker">Szabályzat</span>
          <h1 className="home-title">Versenyszabályzat és részletes feltételek</h1>
          <p className="home-copy">
            Az alábbi részek egymás után böngészhetők, és mindegyik külön is letölthető.
          </p>

          <div className="rules-actions">
            <button className="btn btn-primary" type="button" onClick={handleDownloadAll}>
              Összes letöltése
            </button>
            <a
              className="btn btn-theme-secondary"
              href={publicImage('vonalkovetesNagyfelbontas.png')}
              download="vonalkovetes-nagyfelbontas.png"
            >
              Vonalkövető pálya letöltése
            </a>
          </div>

          <div className="rules-list">
            {allSections.map((section) => {
              const isOpen = openSectionId === section.id;
              return (
                <article key={section.id} className="rules-card">
                  <div className="rules-toggle-row">
                    <button
                      className="rules-toggle"
                      type="button"
                      onClick={() => setOpenSectionId(isOpen ? null : section.id)}
                      aria-expanded={isOpen}
                    >
                      <span>{section.title}</span>
                      <span className="rules-toggle-icon">{isOpen ? '▴' : '▾'}</span>
                    </button>
                    <button className="btn btn-theme-secondary rules-header-download" type="button" onClick={() => downloadDocFile(section.fileName, buildDocument(section))}>
                      Letöltés
                    </button>
                  </div>

                  <div className={`rules-body ${isOpen ? 'open' : ''}`}>
                    <div className="rules-body-inner">
                      <div className="rules-document-preview">
                        <div className="rules-document-meta">Lego Robotverseny • Szabályzat</div>
                        <h3>{section.title}</h3>
                        <div className="rules-list-items">
                          {renderContentItems(section.content, section.id)}
                        </div>
                        <div className="rules-document-footer">A szabályok nem ismerete nem mentesít azok betartása alól.</div>
                      </div>
                      <div className="rules-download-row rules-download-row-bottom">
                        <button className="btn btn-theme-secondary" type="button" onClick={() => downloadDocFile(section.fileName, buildDocument(section))}>
                          Letöltés
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
