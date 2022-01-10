const { isProd } = require('./Utilities');

const timezonelessDateMatcher = /^2[0-1][0-9]{2}-[0-1][0-9]-[0-9]{2}$/;
const acceptableLists = ['normal', 'hard'];
const wordMatcher = /^[a-z]{2,15}$/;
const minNameLength = 2;
const maxNameLength = 128;
const maxNumberOfGuesses = 200;
const maxTime = 24 * 60 * 60 * 1000; // max time is 24 hours
const MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST = 20000;
const GRAND_FATHERED_SHORT_NAMES = new Set('RjDTZ'.split(''));

const reasons = {
    badDate: "Date isn't the correct format, like '2019-04-30'",
    dateOutOfRange: 'Date is too far in the future, greater than UTC+14, or the past',
    badList: "wordlist isn't one of known lists",
    noName: 'You must give a name.',
    badTime: 'Time must be greater than 300 ms less than 24 hours',
    invalidWord: 'Found an invalid word in the guesses',
    unexpectedWord: "The last guess isn't the word I was expecting for this day and wordlist",
    sameWordsAndTime: 'Having the exact same words and same completion time is *very* unlikely',
};

const NO_RESPONSE_INVALID_REASONS = new Set(Object.values(reasons));

function getInvalidReason(dateString, wordlist, name, time, guesses, leaders, fromBackup) {
    leaders = leaders || {};
    const numberOfLeaders = (leaders && Object.keys(leaders).length) || 0;
    if (numberOfLeaders >= MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST) {
        return `Sorry, we only accept ${MAX_NUMBER_OF_LEADERS_FOR_DAYS_WORD_LIST} entries for the board in a day.`;
    }
    const invalidDateReason = getInvalidDateReason(dateString, fromBackup);
    if (invalidDateReason) {
        return invalidDateReason;
    }
    if (!acceptableLists.includes(wordlist)) {
        return `${reasons.badList}. badList: ${wordlist}`;
    }
    if (!name) {
        return reasons.noName;
    }
    if (name.length > maxNameLength) {
        return `Name can't be longer than ${maxNameLength}. Yours is ${name.length}`;
    }
    if (name.trim().length < minNameLength && !GRAND_FATHERED_SHORT_NAMES.has(name)) {
        return `Your name, "${name}" is too short. Try a bit longer one.`;
    }

    const numberOfGuesses = guesses.length;
    // allow guesses = 1 and time = 0, but if guesses are bigger than that the time must be reasonable
    if (integerIsGreaterThan(guesses.length, 1) && !integerIsBetweenRange(time, 300, maxTime)) {
        return `${reasons.badTime}. badTime: ${time}`;
    }
    if (numberOfGuesses >= maxNumberOfGuesses) {
        return `Sorry, the completion board doesn't accept submissions with more than ${maxNumberOfGuesses} guesses`;
    }
    const firstInvalidWord = guesses.find(g => !wordMatcher.test(g));
    if (firstInvalidWord) {
        return `${reasons.invalidWord}. invalidWord: ${firstInvalidWord}`;
    }

    const word = guesses.slice(-1)[0];
    const expectedWord = lookupWord(dateString, wordlist);
    if (!expectedWord) {
        return `Didn't find a word for the date (${dateString}) and wordlist (${wordlist}) you gave.`;
    }
    if (word !== expectedWord) {
        return `${reasons.unexpectedWord}. unexpectedWord: ${word}`;
    }

    if (isInappropriateName(name)) {
        return 'inappropriate';
    }

    const joinedGuesses = guesses.join(',');
    if (!fromBackup && Object.values(leaders).some(sameGuessesAndTime)) {
        return `${reasons.sameWordsAndTime}. name: ${name}, time: ${time}`;
    }

    return '';

    function isInappropriateName(input) {
        const otherWord = lookupOtherWord(dateString, wordlist);
        const lowerCaseNameWithNonSpaceCharsRemoved = input.toLowerCase().replace(/(_|-)/g, '');
        const hasAnswersMatcher = new RegExp(`\\b(${expectedWord}|${otherWord})\\b`);
        return hasBadWord(lowerCaseNameWithNonSpaceCharsRemoved)
            || hasAnswersMatcher.test(lowerCaseNameWithNonSpaceCharsRemoved);
    }

    function sameGuessesAndTime(savedLeader) {
        return savedLeader.time === time
            && savedLeader.guesses.length > 1 // it is likely if both users happened to guess in 1
            && savedLeader.guesses.join(',') === joinedGuesses;
    }
}

const simpleBadWordRegex = /\b(asses|twat)\b/;
const simpleNonBreakingBadWordRegex = /(fuck|dicks|asshole(s)?|shit|cock|penis|cunt|vagina|twats|boob|nigger|kike|puss(y|ies)|fag(s|got)|whore|bitch)/;

function hasBadWord(lowercaseString) {
    return simpleNonBreakingBadWordRegex.test(lowercaseString)
        || simpleBadWordRegex.test(lowercaseString);
}

function getInvalidDateReason(dateString, fromBackup) {
    if (!timezonelessDateMatcher.test(dateString)) {
        return `${reasons.badDate}. badDate: ${dateString}`;
    }
    if (dateIsOutsideOfRange(dateString, fromBackup)) {
        return `${reasons.dateOutOfRange}. dateOutOfRange: ${dateString}`;
    }
    return '';
}

function getInvalidBadNameReport({ reporterName, badName, date, wordlist }, leadersList) {
    if (!leadersList) {
        return `No leaders list for date and wordlist: ${date}, ${wordlist}.`;
    }
    if (!(reporterName in leadersList)) {
        return `Reporter not in leaders list: ${reporterName}.`;
    }
    if (!(badName in leadersList)) {
        return `Bad name not in leaders list: ${badName}`;
    }

    return getInvalidDateReason(date);
}

// FIXME, this is currently just copy-pasted from frontend code, would be much better if we load this from the frontend on startup
/* eslint-disable */
const possibleWords = {
    // normal words were from 1-1,000 common English words on TV and movies https://en.wiktionary.org/wiki/Wiktionary:Frequency_lists/TV/2006/1-1000
    // later normal words were mined from existing guesses
    normal: /* DON'T LOOK CLOSELY UNLESS YOU WANT TO BE SPOILED!!! */['','','','course','against','ready','daughter','work','friends','minute','though','supposed','honey','point','start','check','alone','matter','office','hospital','three','already','anyway','important','tomorrow','almost','later','found','trouble','excuse','hello','money','different','between','every','party','either','enough','year','house','story','crazy','mind','break','tonight','person','sister','pretty','trust','funny','gift','change','business','train','under','close','reason','today','beautiful','brother','since','bank','yourself','without','until','forget','anyone','promise','happy','bake','worry','school','afraid','cause','doctor','exactly','second','phone','look','feel','somebody','stuff','elephant','morning','heard','world','chance','call','watch','whatever','perfect','dinner','family','heart','least','answer','woman','bring','probably','question','stand','truth','problem','patch','pass','famous','true','power','cool','last','fish','remote','race','noon','wipe','grow','jumbo','learn','itself','chip','print','young','argue','clean','remove','flip','flew','replace','kangaroo','side','walk','gate','finger','target','judge','push','thought','wear','desert','relief','basic','bright','deal','father','machine','know','step','exercise','present','wing','lake','beach','ship','wait','fancy','eight','hall','rise','river','round','girl','winter','speed','long','oldest','lock','kiss','lava','garden','fight','hook','desk','test','serious','exit','branch','keyboard','naked','science','trade','quiet','home','prison','blue','window','whose','spot','hike','laptop','dark','create','quick','face','freeze','plug','menu','terrible','accept','door','touch','care','rescue','ignore','real','title','city','fast','season','town','picture','tower','zero','engine','lift','respect','time','mission','play','discover','nail','half','unusual','ball','tool','heavy','night','farm','firm','gone','help','easy','library','group','jungle','taste','large','imagine','normal','outside','paper','nose','long','queen','olive','doing','moon','hour','protect','hate','dead','double','nothing','restaurant','reach','note','tell','baby','future','tall','drop','speak','rule','pair','ride','ticket','game','hair','hurt','allow','oven','live','horse','bottle','rock','public','find','garage','green','heat','plan','mean','little','spend','nurse','practice','wish','uncle','core','stop','number','nest','magazine','pool','message','active','throw','pull','level','wrist','bubble','hold','movie','huge','ketchup','finish','pilot','teeth','flag','head','private','together','jewel','child','decide','listen','garbage','jealous','wide','straight','fall','joke','table','spread','laundry','deep','quit','save','worst','email','glass','scale','safe','path','camera','excellent','place','zone','luck','tank','sign','report','myself','knee','need','root','light','sure','page','life','space','magic','size','tape','food','wire','period','mistake','full','paid','horrible','special','hidden','rain','field','kick','ground','screen','risky','junk','juice','human','nobody','mall','bathroom','high','class','street','cold','metal','nervous','bike','internet','wind','lion','summer','president','empty','square','jersey','worm','popular','loud','online','something','photo','knot','mark','zebra','road','storm','grab','record','said','floor','theater','kitchen','action','equal','nice','dream','sound','fifth','comfy','talk','police','draw','bunch','idea','jerk','copy','success','team','favor','open','neat','whale','gold','free','mile','lying','meat','nine','wonderful','hero','quilt','info','radio','move','early','remember','understand','month','everyone','quarter','center','universe','name','zoom','inside','label','yell','jacket','nation','support','lunch','twice','hint','jiggle','boot','alive','build','date','room','fire','music','leader','rest','plant','connect','land','body','belong','trick','wild','quality','band','health','website','love','hand','okay','yeah','dozen','glove','give','thick','flow','project','tight','join','cost','trip','lower','magnet','parent','grade','angry','line','rich','owner','block','shut','neck','write','hotel','danger','impossible','illegal','show','come','want','truck','click','chocolate','none','done','bone','hope','share','cable','leaf','water','teacher','dust','orange','handle','unhappy','guess','past','frame','knob','winner','ugly','lesson','bear','gross','midnight','grass','middle','birthday','rose','useless','hole','drive','loop','color','sell','unfair','send','crash','knife','wrong','guest','strong','weather','kilometer','undo','catch','neighbor','stream','random','continue','return','begin','kitten','thin','pick','whole','useful','rush','mine','toilet','enter','wedding','wood','meet','stolen','hungry','card','fair','crowd','glow','ocean','peace','match','hill','welcome','across','drag','island','edge','great','unlock','feet','iron','wall','laser','fill','boat','weird','hard','happen','tiny','event','math','robot','recently','seven','tree','rough','secret','nature','short','mail','inch','raise','warm','gentle','gentle','glue','roll','search','regular','here','count','hunt','keep','week','soap','bread','lost','mountain','tent','pack','stupid','make','book','mess','letter','most','stay','what','before','more','bite','lime','best','rope','frog','crab','pile','read','sand','stuck','bottom','duck','take','hurry','tail','other','snake','word','kite','piano','hoop','mother','lazy','knock','please','over','igloo','bath','bean','lung','umbrella','bomb','spin','sorry','back','less','turn','bell','stick','song','energy','late','paint','near','crap','sour','hide','rabbit','never','store','jingle','jump','jelly','people','poop','turtle','melon','loose','sugar','spring','ring','poke','rice','sweet','star','friend','coat','clap','part','lemon','soon','lamp','like','spoon','milk','noise','giraffe','salt','tiger','sack','nope','left','sock','marble','mirror','lick','king','eagle','toast','straw','cone','hear','apple','fart','echo','good','doll','dumb','munch','mouse','hose','fence','sick','pole','goose','onion','super','some','lizard','deer','panda','mouth','monkey','soup','maybe','white','cake','seed','comb','sing','first','silly','miss','laugh','mask','after','wave','grape','fear','same','made','drip','quack','hundred','teach','koala','octopus','right','pizza','park','giant','next','monster','foot','plate','list','dance','goat','horn','banana','each','drink','potato','cheese','feather','voice','crack','smell','slam','hiccup','sunny','puke','cloud','stripe','dress','tummy','hang','meow','cook','there','front','fork','zipper','slow','juggle','wheel','butt','purse','burn','taco','candy','puddle','dragon','tomato','ladder','yawn','earth','wand','noodle','sink','corn','fresh','stack','drum','fifty','extra','because','rubber','cage','chicken','black','tooth','hippo','underwear','pencil','spill','sleep','cave','chair','carrot','score','dizzy','boom','roar','pipe','sweat','alphabet','steam','puppy','club','think','surprise','string','spit','plane','slip','snail','thing','unicorn','bunny','brush','pillow','balloon','animal','stir','tablet','twist','butter','scream','wizard','donut','buzz','swing','smart','boring','soft','kitty','smile','wash','shape','puzzle','tire','snack','below','soda','pancake','climb','pinch','favorite','weed','pants','yellow','roof','again','stare','clock','penguin','pocket','grumpy','swim','snow','dude','goop','shout','lucky','ceiling','circle','belt','better','bird','five','popcorn','four','sandwich','fuzzy','pasta','fridge','oops','fruit','salad','board','flower','blood','forest','couch','fixed','apology','bicycle','imagination','castle','brick','starve','squiggle','region','setting','squeak','biscuit','goldfish','launch','install','flavor','calendar','emergency','burp','invent','rubbish','measure','syrup','address','dish','honest','adorable','retry','cliff','steep','hammock','cheat','backward','tortilla','sled','bleach','scrap','gigantic','homework','barf','eject','bucket','beard','muddy','legend','queasy','accessory','burrito','cancel','trombone','karate','chain','whine','replay','teaspoon','accident','fireworks','weigh','sassy','correct','jackpot','squint','adventure','bobcat','sunlight','cellphone','visitor','above','bamboo','borrow','toolbox','multiply','sparrow','discovery','obstacle','headphones','officer','computer','recover','skateboard','proof','always','moss','macaroni','upset','scribble','trumpet','shadow','serve','howl','shirt','along','yuck','celebrate','statue','verb','crisp','goof','parade','celery','subway','waist','tropical','burger','gurgle','fizzy','steady','sheet','tackle','curve','shield','ding','extreme','sweep','octagon','dinosaur','gravy','slice','janitor','cement','cabbage','beetle','strawberry','angle','independent','vein','guts','pandemic','split','fairy','asleep','fries','hobby','broom','breakfast','ankle','sheep','scratch','breathe','insect','broke','control','recipe','marshmallow','gargle','alien','shock','tongue','pressure','firefighter','angel','curtain','contest','agree','shred','napkin','microphone','panic','tissue','wiggle','sprain','swamp','crunch','combine','chomp','wrestle','another','bruise','tofu','sausage','valley','putty','ooze','bush','alligator','grease','fierce','battery','swallow','cookie','buckle','blur','caught','ribbon','petal','slurp','alley','recess','helicopter','daisy','troll','behind','trophy','groove','plush','snug','doodle','succeed','swap','helmet','anger','busy','defend','daddy','sweater','fidget','closet','alert','shin','slug','yolk','planet','ahead','wrinkle','whistle','cabinet','muscle','fountain','pajamas','medal','wagon','pyramid','fault','focus','clump','taxi','choir','button','quesadilla','brunch','choke','fungus','package','baseball','flute','manatee','narrow','pretend','amazing'],

    // hard words were gotten from a top 100 SAT word list https://education.yourdictionary.com/for-students-and-parents/100-most-common-sat-words.html
    // later hard words were mined from existing guesses
    hard: /* DON'T LOOK CLOSELY UNLESS YOU WANT TO BE SPOILED!!! */['abdicate','empathy','abate','venerable','exemplary','hackneyed','foster','aberration','clairvoyant','extenuating','mundane','forbearance','fortitude','prudent','hypothesis','ephemeral','scrutinize','capitulate','spurious','substantiate','intuitive','tenacious','digression','prosperity','compromise','vindicate','fraught','submissive','ostentatious','boisterous','bias','impetuous','wary','rancorous','deleterious','amicable','reclusive','canny','superficial','emulate','frugal','perfidious','jubilation','brusque','intrepid','sagacity','arid','inconsequential','nonchalant','reconciliation','brazen','prosaic','pretentious','benevolent','aesthetic','adversity','abhor','divergent','fortuitous','conditional','disdain','demagogue','asylum','compassion','hedonist','condescending','querulous','collaborate','inevitable','discredit','renovation','lobbyist','enervating','provocative','florid','convergence','subtle','diligent','surreptitious','orator','superfluous','opulent','capacious','tactful','longevity','restrained','conformist','abstain','pragmatic','reverence','spontaneous','anachronistic','haughty','procrastinate','parched','camaraderie','precocious','evanescent','impute','transient','predecessor','snorkel','confluence','pyromaniac','remedial','genetic','conventional','digitize','corroborate','ossify','compound','proxy','innovate','harassment','disparage','sufficient','negligence','attache','dubious','mandible','temporary','regret','words','convoluted','adequate','diminish','plausible','necessity','materialistic','abysmal','osteoporosis','diminutive','deficient','capture','nutrition','keen','delirious','laminate','lunatic','succulent','fraternity','loathe','entrenched','effigy','hazardous','foment','dilate','condone','osmosis','hypocrite','reconnaissance','anomaly','counteract','delegate','subsequent','underscore','eccentric','seethe','scallop','decree','asymmetrical','devise','enumerate','precedent','peevish','caricature','prohibit','ridiculous','redact','restitution','dispatch','erratic','juvenile','sacrilegious','saucer','flagrant','feasibility','filament','undermine','reclaim','unveil','maternity','superb','exhilarating','quirk','irreconcilable','chasm','suspicious','garment','typical','fructose','dopamine','coarse','resilient','burble','gorge','rhombus','ambiguous','facilitate','repudiate','adversarial','necromancer','mercenary','jaunt','atavistic','analogous','frock','bodacious','proletariat','sundry','theoretical','lament','contemplate','anticipate','culmination','complement','rebuttal','viper','confide','endow','galvanize','summation','constitution','prosecute','auspices','survival','gregarious','syndicate','quorum','ferocious','surreal','melodramatic','justify','controversial','reinforce','ubiquitous','rustic','virtuous','dilemma','provincial','establish','yearn','catamaran','onset','regurgitate','renounce','obsolete','nimbus','orthogonal','amendment','kleptomaniac','herring','marginal','conducive','invade','coincide','deference','scorn','dignity','complacent','sheath','austere','postulate','coddle','nuisance','jarring','amiable','desolate','worthwhile','condemn','indifferent','stupendous','widget','kinetic','clout','avid','theology','sporadic','cognition','confound','retention','provision','knight','callous','gorgeous','refute','agitate','inundate','qualitative','gargoyle','scandalous','restoration','chronic','dire','validate','quell','cuddle','affluent','momentous','synchronous','reconsider','objective','fraudulent','battlement','malleable','notable','impartial','gremlin','withstand','bevel','virile','petulant','preamble','squalor','fray','lavender','buccaneer','blather','calamity','excel','hypothetical','tedious','demonstrate','nominee','leukemia','supine','flourish','peculiar','fluctuate','easel','palliative','nuptials','asynchronous','undulate','brothel','egregious','hostile','dominion','congregate','vicious','malicious','logarithm','conformity','restructure','stark','dependency','jeopardize','perish','incite','limbic','brawl','diversify','intimate','hegemony','warranty','allegory','diligence','mercurial','tryst','zealot','righteous','reconcile','saber','dapper','inversion','placid','immolate','proffer','unilateral','universal','rambunctious','coordination','recompense','foreseeable','geriatric','candid','secrete','jaded','ramification','persecute','guarantee','devious','invoke','simian','astute','sparingly','concise','surly','bohemian','recite','solidarity','dearth','dilute','quench','iteration','lambaste','sociopath','timorous','valiant','apex','susceptible','comparable','fatigue','remnant','query','marauder','recreation','superlative','bogart','omnipotent','chalice','brevity','hitherto','empirical','brute','narrative','potent','advocate','intone','unprecedented','supercilious','nautical','heritage','cadence','kiosk','quid','novice','yacht','taut','quirky','delusion','grim','recoup','quizzical','unadorned','teeming','conduct','gadget','recumbent','tension','expend','tremendous','providence','navigate','robust','juncture','altercation','wallop','wreckage','intravenous','ambivalent','prow','spawn','demur','convey','demeanor','paramount','bubonic','brackish','ornate','calibrate','substantial','temperament','niche','sumptuous','gruesome','sustain','frankly','loiter','yield','nymph','swivel','oxymoron','emphatic','ostensible','bolus','evoke','capitalize','adhere','conceive','lemur','reform','diabolical','delicate','savvy','contradict','sinister','warrant','litigious','arsenal','bygones','vital','nuance','fragile','articulate','precarious','brunt','jolt','rapture','paddock','conviction','deliberate','adamant','exacerbate','surmount','acquisition','discord','jealous','vigor','allude','nascent','envy','provoke','synthesis','treacherous','oust','emit','ameliorate','paranormal','doctrine','cultivate','blemish','surveillance','abscond','tentative','commission','blithe','reluctant','braggart','bemuse','bumpkin','stature','khaki','eloquent','introvert','granular','cower','karma','ruminate','vintage','iota','insatiable','sublimate','fiscal','accumulate','solvent','hydrogen','competent','salacious','apprehensive','transparent','eminent','ostracize','consensus','horizontal','terse','infer','gauge','contender','prompt','hectare','endure','subordinate','entail','lucrative','exploit','assertion','gargantuan','hence','innate','hoist','juggernaut','concede','locomotion','exert','vestigial','quantitative','election','tabular','candor','astringent','nominal','indiscriminate','viable','reproach','kosher','civic','notorious','jubilant','triumvirate','telemetry','judgemental','billet','dismay','clamour','renovate','imposing','transaction','bolster','prescribe','stationary','irrational','yeti','foist','dreary','novel','quaint','recalcitrant','jovial','responsibility','deplete','pinnacle','fumigate','forage','indulge','zombie','sodium','sage','sage','annihilate','rigorous','zenith','harbinger','cumulative','sentiment','fundamental','principle','collate','joust','reticent','knack','deference','rancid','aura','imminent','concur','lye','defer','vain','cogent','catastrophe','auspicious','din','relish','contour','affable','concave','deluge','dastardly','ether','synthetic','commiserate','dell','amble','synergy','dominate','foist','azure','daft','destitute','fable','mandate','myriad','spore','estuary','gall','amenable','expel','inept','bucolic','eon','gaffe','macabre','dunce','cyst','cacophony','coherent','pallid','svelte','gander','surmise','uvula','ramble','nomenclature','pyre','enact','suss','conch','vie','quail','conduit','demure','frantic','recluse','ruse','crass','languish','alimony','garish','sullen','indigo','queue','ozone','spat','inane','intuit','mull','cede','vim','congeal','recede','culpable','culminate','byte','apt','median','fester','dilettante','tepid','iodine','prowess','noxious','lucrative','quibble','sully','ire','condense','vex','czar','emote','congress','adept','deity','destiny','synonym','mnemonic','conifer','ravenous','ghost','inverse','suture','cooperate','tyrant','contempt','gyrate','recant','vestibule','aorta','hubris','reed','sustenance','sublime','garrulous','frail','vacuum','fraud','vile','pernicious','quip','intuition','myopic','isthmus','avarice','jackal','maudlin','tabulate','irate','lucid','deter','omen','postulate','blight','conflate','jocular','salient','hiatus','raze','elegant','convex','surge','oblong','reign','comrade','bray','aghast','cunning','valor','suave','modicum','cogitate','conundrum','jeopardy','coincidence','wan','reckless','conical','invert','abrupt','aggravate','alkaline','allure','amateur','ambient','anvil','augment','axiom','bellicose','belligerent','buccaneer','byzantine','dogma','tangent','preen','lurid','querulous','conceit','irascible','synopsis','illicit','languid','matte','facetious','deciduous','tenacious','catatonic','rupture','dirigible','rhetoric','caustic','connive','indigenous','eulogy','despot','malice','surfeit','zany','entropy','frazzle','indignant','convivial','synapse','fallacy','maverick','iridescent','turgid','futile','lavish','cognizant','regale','maelstrom','quixotic','dystopia','flagrant','quintessential','vivacious','deign','knave','cipher','gallant','clandestine','concatenate','deranged','rudimentary','quaff','demented','lozenge','raucous','cistern','feral','prescient','fraternize','oscillate','surmount','immolate','syndicate','condescend','connotation','scandal','denigrate','tenuous','indolent','cabal','dichotomy','stymie','fatuous','furtive','susceptible','denizen','tumult','exonerate','effigy','sagacious','luminous','miasma','congruent','vilify','coalesce','putrid','manipulate','ludicrous','crustacean','rigor','jamboree','petulant','lambast','effervescent','tacit','detriment','wallow','derelict','craven','pernicious','quarantine','folly','obelisk','relegate','cohort','sycophant','ratify','vindicate','deride','malevolent','lithe','klaxon','caliber','degenerate','irradiate','paranoid','demigod','erudite','nautical','jugular','diatribe','copious','surrogate','voracious','umbrage','dexterity','pallor','remedy','repent','eavesdrop','rampant','ceviche','inanimate','archaic','evince','frivolous','filibuster','idiomatic','moult','satchel','angst','indict','supplement','eloquence','trivial','scoundrel','perigee','nautilus','paranoia','prism','decipher','proverbial','idol','cartilage','discontinuous','chauffeur','rappel','stalactite','semblance','guttural','savory','omniscient','mortify','excrement','filch','supplicant','hallucinate','bootleg','vacate','recuperate','sundries','schematic','tamarind','congenial','forensic','verdict','castigate','truncate','stagnant','maleficent','abalone','integrity','proactive','simile','banshee','fillet','arboreal','plagiarism','microbe','relapse','aspiration','fission','hellacious','filial','requiem','chauvinism','symposium','besmirch','quarrel','miscellaneous','onerous','swashbuckler','subservient','allele','entourage','fondue','neurotic','ardent','lilt','verdant','bode','cynic','contiguous','epaulet','rampage','wyvern','bluster','malady','longitude','mosaic','yurt','tyranny','laud','tangible','lateral','enzyme','usurp','conjecture','facade','pander','abscess','loquacious','demise','masticate','coefficient','quiescent','indicative','ambidextrous','grotto','oracle','dollop','cobalt','gaudy','anonymous','diurnal','despondent','collage','gyroscope','vanguard','tantamount','juxtaposition','syllabus','emancipate','roil','asinine','euphemism','wrath','elongate','vector','tincture','asymptomatic','pneumonia','sentient','buttress','exhume','conglomerate','sacrifice','eerie','subliminal','blunder','doff','vitriol','melancholy','forfeit','pertinent','alleviate','annotate','renege','denounce','igneous','fickle','delectable','perjury','delinquent','dissuade','mezzanine','euphoria','pristine','curtail','harangue','peril','rhizome','halitosis','agnostic','copse','pensive','trundle','spartan','annul','banal','fastidious','abut','suede','turbulent','avast','persevere','elide','luscious','placate','churlish','cauterize','reprobate','fugue','hibernate','verve','atrophy','adroit','catacomb','privy','concentric','saturate','addendum','ricochet','fallow','manifold','accrue','morose','bemoan','impasse','sylvan','aviary','exude','stipulate','sedentary','ogre','trellis','conscience','ingot','dendrite','torrent','cytoplasm','jargon','devolve','curmudgeon','tarnish','citadel','coup','wanton','itinerant','heretic','ineffable','mandatory','omnivore','vagabond','quash','flippant','diffident','vacillate','innocuous','heuristic','bombastic','parabola','ballast','cairn','rapt','haptic'],
};
/* eslint-enable */

// on the frontend because of some counting error we had to duplicate the 618th index word, however, this wasn't a problem on the backend, so remove this from the list when copy-pasting the words from the frontend.
possibleWords.normal = possibleWords.normal.slice(0, 618).concat(possibleWords.normal.slice(619));
possibleWords.hard = possibleWords.hard.slice(0, 618).concat(possibleWords.hard.slice(619));

function lookupWord(dateString, difficulty) {
    const date = getDate(dateString);
    return getWord(date, difficulty);
}

function getDate(dateString) {
    const [year, month, day] = dateString.split('-').map(str => parseInt(str, 10));
    return new Date(year, month - 1, day);
}

function dateIsOutsideOfRange(dateString, fromBackup) {
    const date = +getDate(dateString);
    const now = new Date();
    const minutesToUTC = now.getTimezoneOffset();
    // UTC+14 is the earliest possible date https://en.wikipedia.org/wiki/UTC%2B14:00
    const minutesToEarliestDate = minutesToUTC + (14 * 60);
    const earliestEpochTime = +now + (minutesToEarliestDate * 60 * 1000);
    // const minutesToLatestDate = minutesToUTC - (12 * 60); // latest is UTC-1200
    // const latestEpochTime = +now + (minutesToLatestDate * 60 * 1000);
    return date > earliestEpochTime;

    // // don't check late submit in non prod so tests can work (probably would be better
    // // to mock now or something)

    // // FIXME something is really broken with this, but only in prod
    // || (!fromBackup && isProd && && date < latestEpochTime);
}

function getWord(date, difficulty) {
    const index = getWordIndex(date);
    return possibleWords[difficulty][index];
}

function getWordIndex(date) {
    const doy = getDOY(date);
    const yearOffset = (date.getFullYear() - 2019) * 365;
    // FIXME deal with leap years?
    return doy + yearOffset - 114;
}

function lookupOtherWord(dateString, wordlist) {
    const otherWordList = { normal: 'hard', hard: 'normal' }[wordlist];
    return lookupWord(dateString, otherWordList);
}

function integerIsBetweenRange(number, min, max) {
    return integerIsGreaterThan(number, min)
        && number < max;
}

function integerIsGreaterThan(number, min) {
    return Number.isInteger(number)
        && number > min;
}

// https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
/* eslint-disable */
function isLeapYear(date) {
    var year = date.getFullYear();
    if ((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
}

// Get Day of Year
function getDOY(date) {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = date.getMonth();
    var dn = date.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if (mn > 1 && isLeapYear(date)) dayOfYear++;
    return dayOfYear;
};
/* eslint-enable */

module.exports = {
    getInvalidReason,
    NO_RESPONSE_INVALID_REASONS,
    getInvalidBadNameReport,
    hasBadWord,
};
