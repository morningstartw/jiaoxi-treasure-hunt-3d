// 礁溪文化尋寶任務資料庫
// 涵蓋三個必做景點與五大線索任務，所有歷史、地理與農特產皆有可查證來源

export const SCENES_DATA = {
  tangweigou: {
    id: 'tangweigou',
    name: '湯圍溝溫泉公園',
    engName: 'Tangweigou Hot Spring Park',
    desc: '礁溪鄉市中心的標誌性溫泉公園，擁有自然湧出的碳酸氫鈉泉。園區內有涼亭木棧道、免費公共泡腳池與溫泉魚體驗，是旅人洗去疲憊的文化地標。',
    position: { x: -35, y: 0, z: -15 },
    realPhoto: 'images/tangweigou.jpg',
    color: '#e67e22'
  },
  xietian: {
    id: 'xietian',
    name: '礁溪協天廟',
    engName: 'Jiaoxi Xietian Temple',
    desc: '創建於清嘉慶九年（1804年），北臺灣香火最鼎盛的關帝廟。清同治年間提督劉明燈奏請朝廷敕建。廟內供奉全臺罕見之「蠶絲關公」，每年春祭乞龜大典更是地方珍貴民俗。',
    position: { x: 35, y: 0, z: -16 },
    realPhoto: 'images/xietian_temple.jpg',
    color: '#c0392b'
  },
  wufengqi: {
    id: 'wufengqi',
    name: '五峰旗風景特定區',
    engName: 'Wufengqi Waterfall Scenic Area',
    desc: '因後方五座山峰並列宛如五面三角旌旗而得名。全區擁有著名的三層瀑布，水氣充沛、負離子極高，茂密林蔭與地質斷層構成絕佳的自然生態教室。',
    position: { x: 0, y: 0, z: 44 },
    realPhoto: 'images/wufengqi.jpg',
    color: '#27ae60'
  }
};

export const TASKS_DATA = [
  {
    id: 'task_spring',
    sceneId: 'tangweigou',
    title: '任務一：溫泉水質的祕密',
    locationName: '湯圍溝溫泉公園',
    clueObject: '木造泉質解說告示牌',
    realPhoto: 'images/tangweigou.jpg',
    photoCredit: 'Yu tptw / Wikimedia Commons (CC BY-SA 4.0)',
    culturalSource: '礁溪鄉公所官方網站《湯圍溫泉源流與碳酸氫鈉泉質考證》',
    stampId: 'stamp1',
    stampName: '湯圍暖足印',
    prompt: '請仔細觀察告示牌上關於礁溪溫泉的介紹：礁溪溫泉被譽為「美人湯」，請問它的泉質特點為何？',
    options: [
      { text: 'A. 帶有強烈硫磺刺鼻臭味，泉水呈現乳白色酸性', isCorrect: false, hint: '礁溪溫泉與北投或陽明山的酸性硫磺泉不同，它清澈無味喔！' },
      { text: 'B. 無色無味之「碳酸氫鈉泉」，洗後皮膚滑潤，可飲可浴', isCorrect: true, hint: '' },
      { text: 'C. 冰涼的高山冷泉，富含二氧化碳氣泡', isCorrect: false, hint: '冷泉是宜蘭蘇澳的特色，礁溪可是熱騰騰的溫泉鄉！' },
      { text: 'D. 高濃度的強酸性硫酸鹽泉，具有強烈腐蝕性', isCorrect: false, hint: '礁溪溫泉水質溫和，PH值約在7.0~7.4之間呈中性或弱鹼性！' }
    ],
    explanation: '礁溪溫泉是全臺灣少見的平地溫泉，水質屬於清澈透徹、無臭無味的「碳酸氫鈉泉」，泉溫約在58°C左右。因為富含鈉、鎂、鈣、鉀等礦物質，浸泡後皮膚感覺滑溜潤澤，因此素有「美人湯」的美譽。早期宜蘭八景中的「湯圍溫泉」正是指此處！'
  },
  {
    id: 'task_crops',
    sceneId: 'tangweigou',
    title: '任務二：溫泉蔬果籃的考驗',
    locationName: '湯圍溝溫泉公園',
    clueObject: '竹編溫泉農產菜籃',
    realPhoto: 'images/crops.jpg',
    photoCredit: 'Arya kangkung / Wikimedia Commons (CC BY-SA 4.0)',
    culturalSource: '宜蘭縣礁溪鄉農會《礁溪溫泉蔬菜栽培與農特產專題》',
    stampId: 'stamp2',
    stampName: '溫泉蔬果印',
    prompt: '走近溫泉菜籃，農夫利用富含礦物質的溫泉水灌溉農作。請問下列哪一項「不是」礁溪最著名的溫泉灌溉農特產？',
    options: [
      { text: 'A. 莖部粗大、口感清脆無渣的「溫泉空心菜（水蕹菜）」', isCorrect: false, hint: '溫泉空心菜因溫泉水溫長得快，莖粗葉嫩，是礁溪第一名產喔！' },
      { text: 'B. 皮薄汁多、酸甜濃郁的冬春限定「溫泉番茄」', isCorrect: false, hint: '溫泉番茄利用溫泉水恆溫滋養，風味酸甜適中，是當地著名伴手禮。' },
      { text: 'C. 需要高山寒冷氣候的「雪地水蜜桃」', isCorrect: true, hint: '' },
      { text: 'D. 口感細緻、清甜脆口的水耕「溫泉筊白筍」', isCorrect: false, hint: '礁溪的溫泉茭白筍（美人腿）也是利用溫泉田栽培的經典特產！' }
    ],
    explanation: '礁溪溫泉不僅能泡湯，當地農民更巧妙利用含有礦物質的溫泉水調節水溫與土壤，培育出赫赫有名的「礁溪四寶」：溫泉空心菜、溫泉番茄、溫泉茭白筍與溫泉絲瓜。其中溫泉空心菜因其莖管特粗、炒後不黑、質地清脆爽口而聞名全台！'
  },
  {
    id: 'task_temple',
    sceneId: 'xietian',
    title: '任務三：協天帝君的鎮廟瑰寶',
    locationName: '礁溪協天廟',
    clueObject: '關帝聖君建築文化展架',
    realPhoto: 'images/xietian_temple.jpg',
    photoCredit: 'Sheng-Hung Lin / Wikimedia Commons (CC BY-SA 4.0)',
    culturalSource: '宜蘭縣政府文化局《礁溪協天廟志與清代敕建歷史考證》',
    stampId: 'stamp3',
    stampName: '協天帝君印',
    prompt: '閱讀協天廟文化卡上的記載：協天廟是北台灣關帝信仰重鎮，廟中藏有一尊極為珍罕、全台獨一無二的「鎮廟之寶」，請問是哪一種材質製成的神像？',
    options: [
      { text: 'A. 整尊採用柔軟輕盈的「蠶絲」編織塗漆脫胎製成的關公像', isCorrect: true, hint: '' },
      { text: 'B. 採集自中央山脈的千年紅檜巨木雕刻', isCorrect: false, hint: '雖然中式廟宇常有檜木雕刻，但協天廟最獨一無二的國寶是用動物纖維製作的神工之作！' },
      { text: 'C. 純金打造的百斤黃金關公立像', isCorrect: false, hint: '這尊神像總重僅約一斤多，極其輕巧，並非沉重的金屬鑄造！' },
      { text: 'D. 西域引進的青銅鑄造戰神像', isCorrect: false, hint: '這是日治時期請福州師傅以特殊工藝「引蠶吐絲」精心塑型的珍稀神像！' }
    ],
    explanation: '協天廟的鎮廟之寶是日治時期由地方人士聘請福州工匠精製的「蠶絲關公」神像。工法是先做好骨架泥模，再巧妙引導蠶寶寶在其上吐絲成繭，層層交疊後脫模成型並安金彩繪。整尊神像鬚眉生動且重量不到一公斤，是臺灣罕見且極為精緻的宗教藝術國寶。'
  },
  {
    id: 'task_turtle',
    sceneId: 'xietian',
    title: '任務四：春祭乞龜的平安盟約',
    locationName: '礁溪協天廟',
    clueObject: '廟埕乞龜祝壽供桌',
    realPhoto: 'images/turtle.jpg',
    photoCredit: 'Bo-Chen Chen / Wikimedia Commons (CC BY-SA 4.0)',
    culturalSource: '宜蘭縣政府文化局《無形文化資產・協天廟春祭乞龜大典》',
    stampId: 'stamp4',
    stampName: '春祭平安印',
    prompt: '每年農曆正月十三日是協天廟盛大的「春祭乞龜大典」。民間信徒擲筊向關帝爺「乞得」平安壽龜回家享用後，按照傳統習俗，隔年應該遵守什麼約定？',
    options: [
      { text: 'A. 願望達成後，隔年必須「加倍還龜（倍還）」答謝神恩', isCorrect: true, hint: '' },
      { text: 'B. 將龜殼風乾後掛在門楣辟邪，永遠不需歸還', isCorrect: false, hint: '壽龜多由米糕、麵粉酥或白米製成，且乞龜有借有還，象徵福氣綿延！' },
      { text: 'C. 必須立刻在廟前放生一隻野生陸龜', isCorrect: false, hint: '乞龜民俗求的是象徵長壽平安的「糕餅龜/米龜」，不是放生動物喔！' },
      { text: 'D. 隔年將整座廟宇重新粉刷油漆', isCorrect: false, hint: '傳統還願是以供奉加倍重量或更大份量的壽龜，讓下一位信徒繼續祈求！' }
    ],
    explanation: '協天廟每逢農曆正月十三日（關聖帝君飛昇成道日）舉辦春祭，重頭戲就是熱鬧的「乞龜」。早年各村信眾會製作大型甜米糕龜與麵粉酥龜供信徒乞取吃平安。民間深信「有借有還、再借不難」，信徒如願順遂後，隔年皆會「加倍還願」，使得壽龜年年更加碩大豐盛，體現了地方信賴與祈福互助的良善文化！'
  },
  {
    id: 'task_waterfall',
    sceneId: 'wufengqi',
    title: '任務五：五峰飛瀑的山林明信片',
    locationName: '五峰旗風景特定區',
    clueObject: '觀瀑景觀明信片展架',
    realPhoto: 'images/wufengqi.jpg',
    photoCredit: 'Sheng-Hung Lin / Wikimedia Commons (CC BY-SA 4.0)',
    culturalSource: '交通部觀光署東北角及宜蘭海岸國家風景區管理處《五峰旗步道地質與瀑布名勝》',
    stampId: 'stamp5',
    stampName: '五峰飛瀑印',
    prompt: '在觀瀑台上欣賞五峰旗瀑布的壯麗風光。請問五峰旗瀑布在地形結構上共有幾層瀑布？且其地名「五峰旗」由來為何？',
    options: [
      { text: 'A. 共有三層瀑布；因後方並列五座尖峰宛若戰場旌旗而得名', isCorrect: true, hint: '' },
      { text: 'B. 共有七層瀑布；因曾有五位將軍在此插旗駐軍而得名', isCorrect: false, hint: '五峰旗共有三層瀑布，由上而下分別全長約100公尺，可循步道尋訪！' },
      { text: 'C. 僅有一層單一巨大斷崖瀑布；因為四季有五種不同旗幟飄揚', isCorrect: false, hint: '走在步道上可以依序觀賞到下層、中層與最壯觀的上層瀑布喔！' },
      { text: 'D. 共有兩層雙生瀑布；因五條溪流在此匯流而得名', isCorrect: false, hint: '瀑布主要分為三層，五峰指的是後方險峻挺拔的山峰外觀！' }
    ],
    explanation: '五峰旗風景特定區因山勢峭拔，後面矗立著五座相連的尖聳山峰，形狀好似古代軍中迎風招展的五面三角旌旗，因而得名「五峰旗」。瀑布全長約100公尺，共分三層：第三層（下層）水流平緩適合踏水；第二層（中層）自山壁奔瀉而下，旁設有觀瀑亭；第一層（上層）瀑布最為壯麗雄偉。山谷中富含充沛的負離子芬多精，是宜蘭最具代表性的自然景觀！'
  }
];

export const TREASURE_CHEST = {
  title: '文化寶箱（旅人任務板旁）',
  requiredStamps: 5,
  badgeName: '礁溪文化旅人數位徽章',
  badgeImage: 'images/badge.svg'
};
