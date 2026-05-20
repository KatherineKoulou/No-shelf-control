/* =============================================================
   No Shelf Control — Shared data layer (Firestore)
   Books and TBR live in Firestore. Local caches stay in sync via
   onSnapshot subscriptions, so reads are synchronous after init().
   ============================================================= */

window.NSC = (function () {
  // Firestore handles (populated by init())
  let db = null;
  let booksCol = null;
  let tbrCol = null;
  let membersCol = null;

  // Local caches kept in sync via onSnapshot
  let booksCache = [];
  let tbrCache = [];
  let membersCache = [];
  let initialized = false;
  let initPromise = null;

  // Real-time change subscribers
  let changeCallbacks = [];

  const MEMBERS = ['joanna', 'kat', 'lexey', 'mazhar', 'meesh', 'zyrian'];
  const MEMBER_LABELS = {
    joanna: 'Joanna', kat: 'Katherine', lexey: 'Lexey',
    mazhar: 'Mazhar', meesh: 'Michelle', zyrian: 'Zyrian'
  };

  // Initial seed books (in chronological order)
  const INITIAL_BOOKS = [
    {
      id: 'iwhnkm', slug: 'i-who-have-never-known-men',
      title: 'I Who Have Never Known Men', author: 'Jacqueline Harpman',
      genre: 'Science Fiction', pages: 208,
      date: '2024-08-10', location: 'Revolution',
      goodreads: 4.26,
      ratings: { joanna: null, kat: 3.5, lexey: 5, mazhar: null, meesh: 3, zyrian: 3.5 },
      coverClass: 'cover-1', coverEmblem: 'Our First Read',
      questions: [
        { theme: 'Exploration of Identity and Humanity', text: 'How does the lack of names and backgrounds for the characters affect your understanding of their identities? What does this choice by the author suggest about the nature of identity and what it means to be human?' },
        { theme: 'Isolation vs Community', text: 'The novel presents a stark contrast between isolation and community. How do the women in the cage form a sense of community, and how does this change after their release? What does this say about human connection?' },
        { theme: 'The Role of Memory and History', text: "The protagonist grapples with the absence of a past and uncertainty about the future. How does the lack of history and memory shape the characters' experiences and choices? How important is memory in constructing a sense of self?" },
        { theme: 'Survival vs Freedom', text: "The women are kept in captivity without knowing why. What does the novel suggest about the concept of freedom and survival? How do the characters' ideas about freedom evolve throughout the story?" },
        { theme: 'Gender and Society', text: "The title and narrative raise questions about gender and societal roles. How does the story explore themes related to femininity, masculinity, and the absence of men? What impact does this have on the characters and the reader's perception of their world?" }
      ]
    },
    {
      id: 'dos', slug: 'daughters-of-shandong',
      title: 'Daughters of Shandong', author: 'Eve J. Chung',
      genre: 'Historical Fiction', pages: 400,
      date: '2024-09-06', location: 'Palladio Barnes & Noble',
      goodreads: 4.51,
      ratings: { joanna: null, kat: 5, lexey: 5, mazhar: null, meesh: 4, zyrian: 4 },
      coverClass: 'cover-3', coverEmblem: 'Historical Fiction',
      questions: [
        { theme: 'Tradition vs Modernity', text: 'The characters navigate the tension between traditional values and the demands of modern life. How have you experienced or observed similar tensions in your own life or culture? In what ways do you balance tradition with modernity?' },
        { theme: 'Role of Women', text: 'The book addresses the evolving roles of women in society. How do you view the roles of women in your own life and community? Have you noticed changes in expectations or opportunities for women over time, and how do these changes align with the themes presented in the book?' },
        { theme: 'Change and Adaptation', text: 'Change is a constant theme in the book, which affected the characters in profound ways. In what ways did Hai, Di, and their mother adjust to change and their need to adapt to their environments? How do you personally cope with change?' },
        { theme: 'Generational Perspectives', text: 'The relationships between generations in the novel often highlight differing values and expectations. How do you relate to the generational dynamic in your own family? Have you experienced similar conflicts or understanding between generations, and how did you navigate them?' },
        { theme: 'Sacrifice and Choices', text: 'The characters in the book often face difficult choices that require personal sacrifice. Reflecting on your own life, have you ever had to make a significant sacrifice for the greater good or for someone else? How do you feel about that decision now?' }
      ]
    },
    {
      id: 'sok', slug: 'the-sword-of-kaigen',
      title: 'The Sword of Kaigen', author: 'M. L. Wang',
      genre: 'Fantasy', pages: 651,
      date: '2024-10-28', location: 'Federalist Pizza',
      goodreads: 4.47,
      ratings: { joanna: null, kat: 3, lexey: 4.25, mazhar: null, meesh: 4.5, zyrian: 4 },
      coverClass: 'cover-8', coverEmblem: 'Fantasy',
      questions: [
        { theme: 'Character Evolution and Relationships', text: 'Discuss the development of Misaki Matsuda throughout the story. How does her past shape her actions, and what does her journey tell us about resilience and identity? How do her relationships with other characters, particularly Takeru and Mamoru, evolve over the course of the novel?' },
        { theme: 'Tradition and Warfare', text: "Traditional values and customs heavily influence the way battles are fought and the roles characters play. How do the characters' adherence to tradition impact their effectiveness in warfare? Are there moments where tradition seems to conflict with the demands of survival?" },
        { theme: 'Magic System', text: 'What do you think the author is trying to convey through the different elemental powers? How do the elements — particularly water and ice — reflect the personalities, struggles, or growth of the characters who wield them? Which elemental magic would you wield?' },
        { theme: 'Personal Honor vs Family Honor', text: 'Many characters in the novel struggle between their personal sense of honor and the expectations tied to family honor. How do different characters navigate this tension, and what does the novel suggest about the importance of honor in one\'s life?' },
        { theme: 'Narrative Style and Structure', text: 'The book is known for its unique structure, including flashbacks and varied points of view. How does the narrative style affect your understanding of the characters and events? Did the structure enhance or hinder your reading experience, and why?' }
      ]
    },
    {
      id: 'echo', slug: 'the-echo-of-old-books',
      title: 'The Echo of Old Books', author: 'Barbara Davis',
      genre: 'Historical Fiction', pages: 431,
      date: '2024-12-05', location: 'Mas Tacos',
      goodreads: 4.28,
      ratings: { joanna: null, kat: 1, lexey: 4, mazhar: null, meesh: 1.5, zyrian: 2.5 },
      coverClass: 'cover-4', coverEmblem: 'Historical Fiction',
      questions: [
        { theme: 'The Power of Stories', text: 'The novel explores how books carry the echoes of the lives they touch. Have you ever felt a deep, personal connection to a book, and how does that compare to the connections described in the novel?' },
        { theme: 'Connection Between Books and Emotions', text: "The protagonist's ability to sense the emotions and stories imprinted on old books is a unique element of the novel. How does this gift affect her relationships and choices? What does the story suggest about the emotional power of books and the stories they hold?" },
        { theme: 'The Role of Memory', text: 'Memory plays a significant role in how characters interpret their lives and relationships. How does the author use the theme of memory to explore identity and healing? Are there moments where memory serves as both a blessing and a curse?' },
        { theme: 'Dual Timelines', text: 'The story alternates between different timelines. How did this structure impact your reading experience? Did it enhance your understanding of the characters and their journeys, or did it create any challenges?' },
        { theme: 'Love and Loss', text: "Themes of love and heartbreak are central to the narrative. How do the characters' experiences with love shape their decisions and growth? Were there any moments that particularly resonated with you or felt particularly poignant?" }
      ]
    },
    {
      id: 'hom', slug: 'here-one-moment',
      title: 'Here One Moment', author: 'Liane Moriarty',
      genre: 'Thriller', pages: 512,
      date: '2025-01-31', location: 'Saigon Alley',
      goodreads: 4.10,
      ratings: { joanna: null, kat: 1, lexey: 0.5, mazhar: null, meesh: 1, zyrian: 2.5 },
      coverClass: 'cover-1', coverEmblem: 'A Thriller',
      questions: [
        { theme: 'Fate vs Free Will', text: "Cherry's predictions are central to the story. Have you ever felt like something in your life was destined to happen, or do you believe everything is shaped by your choices?" },
        { theme: 'Character Reactions', text: "Have you ever received information that made you rethink your life choices? Which character's reaction to Cherry's predictions do you relate to most, and why?" },
        { theme: 'The Power of Fear and Hope', text: "Cherry's predictions sparked both fear and hope in the passengers. Can you think of a time when fear or hope drove you to make a significant change in your life?" },
        { theme: 'Multiple POVs', text: "The story is told through the perspectives of various characters. How did the multiple points of view impact your understanding of the story? Did you connect more deeply with one character's perspective, and why?" },
        { theme: 'What Would You Do?', text: 'If someone told you when and how you might die, how do you think it would change the way you live your life? Would you make any drastic changes, or would you continue as you are?' }
      ]
    },
    {
      id: 'pw', slug: 'the-poppy-war',
      title: 'The Poppy War', author: 'R. F. Kuang',
      genre: 'Fantasy', pages: 545,
      date: '2025-03-15', location: 'Mikuni Midtown',
      goodreads: 4.17,
      ratings: { joanna: null, kat: 4.5, lexey: 5, mazhar: null, meesh: 4.75, zyrian: 4.25 },
      coverClass: 'cover-2', coverEmblem: 'The Poppy War · 1',
      questions: [
        { theme: "Rin's Journey and Moral Choices", text: "Throughout the novel, Rin evolves from an ambitious scholar to a ruthless warrior. How do her choices reflect the theme of power and its consequences? Do you think she had any real alternatives to the path she took?" },
        { theme: 'Historical Parallels', text: 'The Poppy War is inspired by real historical events, particularly the Second Sino-Japanese War and the Nanjing Massacre. How does the novel balance fantasy elements with historical realism? Did the knowledge of these real-world parallels impact your reading experience?' },
        { theme: 'Magic and Gods', text: "The concept of shamanism and divine power plays a significant role in the story. Do you think the gods in the novel represent external forces, or do they reflect aspects of human nature? How does Rin's connection to the Phoenix shape her identity?" },
        { theme: 'Morality in War', text: "The novel doesn't shy away from portraying the brutal realities of war. Were there moments where you questioned Rin's actions or sympathized with the choices she made? How does Kuang challenge the idea of traditional heroism?" },
        { theme: 'Power and Oppression', text: 'The book explores themes of classism, racism, and colonialism, particularly in the treatment of Nikara and Speerlies. How do these power dynamics shape the world of The Poppy War, and do you see any parallels to our own society?' }
      ]
    },
    {
      id: 'dr', slug: 'the-dragon-republic',
      title: 'The Dragon Republic', author: 'R. F. Kuang',
      genre: 'Fantasy', pages: 654,
      date: '2025-05-15', location: 'Uncle Dumpling',
      goodreads: 4.37,
      ratings: { joanna: null, kat: 4, lexey: 4.5, mazhar: null, meesh: 5, zyrian: 4.5 },
      coverClass: 'cover-7', coverEmblem: 'The Poppy War · 2',
      questions: [
        { theme: 'Identity and Transformation', text: 'Rin struggles with her identity, including her heritage, powers, and sense of loyalty. How does her internal conflict shape her decisions throughout the novel, and in what ways does her identity evolve from the beginning to the end of the story?' },
        { theme: 'Power and Leadership', text: "Power is portrayed as both a tool and a burden. How does Rin's relationship with power change throughout the book, and how do different characters — such as the Dragon Warlord or the Empress — represent different models of power and leadership?" },
        { theme: 'Loyalty and Betrayal', text: "Themes of friendship, trust, and betrayal are central to Rin's relationships, particularly with Kitay and Nezha. How do these dynamics influence Rin's emotional state and strategic decisions during the war?" },
        { theme: 'Colonialism and Influence', text: "The Hesperians' involvement in Nikan's future introduces themes of cultural superiority and colonial influence. How does their presence impact the political dynamics of the Dragon Republic, and what commentary is Kuang making about foreign intervention?" },
        { theme: 'Addiction and Control', text: "Rin's dependence on opium and the Phoenix reflects her struggle with control. How does Kuang use addiction as a metaphor for power, and what does it reveal about Rin's vulnerabilities?" }
      ]
    },
    {
      id: 'bg', slug: 'the-burning-god',
      title: 'The Burning God', author: 'R. F. Kuang',
      genre: 'Fantasy', pages: 622,
      date: '2025-07-04', location: "Katherine's Apartment",
      goodreads: 4.30,
      ratings: { joanna: null, kat: 5, lexey: 4.5, mazhar: null, meesh: 5, zyrian: 5 },
      coverClass: 'cover-5', coverEmblem: 'The Poppy War · 3',
      questions: [
        { theme: 'Leadership and Isolation', text: 'As Rin gains more control, she becomes increasingly isolated from those around her. How does power affect her relationships and decision-making? What commentary does the book offer on the loneliness of leadership?' },
        { theme: 'Sacrifice and Cost', text: 'Victory in war often comes at an immense cost, both personal and national. What are the most significant sacrifices Rin makes in the final installment? Were they necessary, or could there have been another path?' },
        { theme: 'Legacy and Memory', text: 'Throughout the trilogy, characters are obsessed with legacy — how they will be remembered, or if at all. How does the novel explore the idea of historical memory, especially in the way Rin\'s story concludes?' },
        { theme: 'Madness and Divinity', text: "Rin's connection to the Phoenix god becomes increasingly unstable as the story progresses. How does Kuang blur the line between divine inspiration and madness? What does the Phoenix ultimately represent for Rin?" },
        { theme: 'Endings and Closure', text: "The Burning God concludes Rin's story in a way that is both tragic and thematically rich. Do you find the ending satisfying? How does it reinforce or challenge the central themes of the trilogy as a whole?" }
      ]
    },
    {
      id: 'wotm', slug: 'the-will-of-the-many',
      title: 'The Will of the Many', author: 'James Islington',
      genre: 'Fantasy', pages: 611,
      date: '2025-08-30', location: "Katherine's Apartment",
      goodreads: 4.60,
      ratings: { joanna: 4, kat: 4.5, lexey: 4, mazhar: null, meesh: 4, zyrian: 4.25 },
      coverClass: 'cover-2', coverEmblem: 'Hierarchy · Book 1',
      questions: [
        { theme: 'Power and Hierarchy', text: 'The Catenan Empire is built on a rigid power structure reinforced by using Will. What commentary does the book make about how power is distributed and maintained in authoritarian societies? How do different characters embody or subvert these roles?' },
        { theme: 'Secrets and Identity', text: 'Vis carries a heavy burden of secrets about his past, his mission, and even his true name. How does the theme of hidden identity shape his interactions with others, and how does it influence the way readers come to understand him as a protagonist?' },
        { theme: 'Homecoming and Change', text: "When Vis returned to Suus, he's confronted with a place that no longer feels like home. Have you ever returned to a place and found it changed in ways you didn't expect? How did that experience impact your sense of identity, nostalgia, or belonging?" },
        { theme: 'Ruins and Mystery', text: 'What do the Labyrinth and its monstrous inhabitants suggest about the forgotten or hidden parts of the world? How do these elements contrast with the order of the Hierarchy, and what might they symbolize?' },
        { theme: 'Twists and Revelations', text: 'The ending of the book delivers major revelations that reframe much of what Vis and the reader thought they understood. What were your reactions to the final twists? How do these revelations set the tone for the rest of the series?' }
      ]
    },
    {
      id: 'wds', slug: 'wild-dark-shore',
      title: 'Wild Dark Shore', author: 'Charlotte McConaghy',
      genre: 'Fiction', pages: 298,
      date: '2025-10-04', location: 'Heretic Brewing Co.',
      goodreads: 4.19,
      ratings: { joanna: 3, kat: 4, lexey: 3.5, mazhar: null, meesh: 2.5, zyrian: 3 },
      coverClass: 'cover-4', coverEmblem: 'A Novel',
      questions: [
        { theme: 'Place as Character', text: 'Shearwater Island is more than simply a setting, but rather a primary focus for the story. In what ways does the island itself "speak" in the novel? How do the characters\' relationships to Shearwater evolve, and what does that evolution reflect about their inner lives?' },
        { theme: 'Ethical Priorities and Sacrifice', text: "The Salts are charged with protecting the world's seed bank, even as their own survival is threatened. Orly, in particular, defies the plan by choosing seeds he finds beautiful over the most pragmatic ones. Who do you think is \"right\": the one who optimizes for future survival or the one who acts from emotional attachment?" },
        { theme: 'Perspective and Emotional Depth', text: 'The story unfolds through the perspective of multiple characters. How does the use of multiple POVs influence your understanding of the characters and their relationships? Did shifting perspectives deepen your empathy or shift your loyalties at any point in the story?' },
        { theme: 'Trust, Secrets, and Betrayal', text: "Rowan arrives with secrets, and the Salt family kept hidden truths. The slow revelation of these secrets drives tension. Which secret or betrayal surprised you the most? How do you think trust is rebuilt in the book's arc?" },
        { theme: 'Hope, Endings, and Continuity', text: 'What were your thoughts about the ending? Do you see the ending as hopeful, tragic, ambiguous, or a mixture? What did the ending suggest about continuity, legacy, and what it means to survive a broken world?' }
      ]
    },
    {
      id: 'bobh', slug: 'blood-over-bright-haven',
      title: 'Blood Over Bright Haven', author: 'M. L. Wang',
      genre: 'Fantasy', pages: 417,
      date: '2025-11-26', location: 'Virtual · FaceTime',
      goodreads: 4.38,
      ratings: { joanna: 4, kat: 5, lexey: 5, mazhar: null, meesh: 5, zyrian: 5 },
      coverClass: 'cover-5', coverEmblem: 'A Novel',
      questions: [
        { theme: 'Ambition and Gender', text: "Sciona's ambition is shaped by the constant need to prove herself worthy in a male-dominated environment. Have you ever felt pressure to prove your value or capability in a space where women were underrepresented or underestimated? How do societal or cultural expectations around ambition, leadership, and \"success\" influence how you set and pursue your goals?" },
        { theme: 'Magic Systems', text: "How did this system compare to other magic systems you've encountered in fantasy novels? Did you find it more thought-provoking, immersive, or emotionally charged than others? What stood out to you about its originality? What felt familiar?" },
        { theme: 'Magic, Technology, and Consequences', text: 'In the setting of Tiran, magic is treated much like technology: it powers the city, its infrastructure, even daily life. What do you think the book is saying about technological progress and its hidden costs? Can you identify moments in the story where the use of magic or innovation comes at a moral or social cost?' },
        { theme: 'Intention vs Outcome', text: "Are there moments where a 'good' intention leads to harmful consequences, or where someone with 'bad' intention leads to an unexpectedly positive effect? How do these moments affect your evaluation of the characters?" },
        { theme: 'Genre Expectations', text: 'Blood Over Bright Haven carries many features of "academia fantasy" (institutions, examinations, ambition), but also subverts expectations with darker themes. How did the novel meet or diverge from your expectations for a school-magic story?' }
      ]
    },
    {
      id: 'sotf', slug: 'the-strength-of-the-few',
      title: 'The Strength of the Few', author: 'James Islington',
      genre: 'Fantasy', pages: 736,
      date: '2026-02-02', location: 'Virtual · FaceTime',
      goodreads: 4.61,
      ratings: { joanna: 2.5, kat: 3.5, lexey: 5, mazhar: 4, meesh: 3.5, zyrian: 3.5 },
      coverClass: 'cover-2', coverEmblem: 'Hierarchy · Book 2',
      questions: [
        { theme: 'World-Hopping & Setting Immersion', text: 'Which world or setting did you find more compelling, immersive, or emotionally resonant? Were there any that felt confusing or less developed? How did the contrast between these worlds enhance your understanding of the broader conflict? Which world would you most (or least) want to live in?' },
        { theme: 'Grief, Closure & the Past', text: "Vis is given the chance to reconnect with people he's lost. How did you feel about these reunions, and what do they reveal about Vis's emotional state and growth? If you were given the chance to speak with someone you've lost, what would that moment mean to you?" },
        { theme: 'Mystery & Interpretation', text: 'Who do you think Ka really is? Do you see him as a god, a tyrant, a necessary evil, or something else entirely? What clues do you think James Islington is giving us about his role in the multiverse?' },
        { theme: 'Time, Consequence & Perspective', text: 'How did the time-hopping structure impact your reading experience? Did it enhance the emotional depth and tension, or did it create confusion at times?' },
        { theme: 'Future Arcs & Series Momentum', text: 'What are you most curious to see explored if the series continues? Are there specific plot threads, character arcs, or worldbuilding layers that you hope get deeper attention?' }
      ]
    },
    {
      id: 'atm', slug: 'atmosphere',
      title: 'Atmosphere', author: 'Taylor Jenkins Reid',
      genre: 'Romance', pages: 352,
      date: '2026-03-25', location: 'Virtual · FaceTime',
      goodreads: 4.39,
      ratings: { joanna: 4, kat: 1.5, lexey: 5, mazhar: 2, meesh: 1.5, zyrian: 3 },
      coverClass: 'cover-3', coverEmblem: 'A Novel',
      questions: [
        { theme: 'Awe & Perspective', text: "The vastness of space often reshapes how characters see themselves and their place in the world. How does the setting of space influence the themes of the novel? What does the book suggest about humanity's desire to explore and the emotional impact of seeing the world from afar?" },
        { theme: 'Genre & Narrative Balance', text: 'Atmosphere blends elements of historical fiction with a central romantic storyline, shifting between broader historical context and intimate character relationships. How did you feel about the balance between the historical setting and the romance?' },
        { theme: 'Gender & Institutional Culture', text: 'How does the book depict the culture at NASA for women — both the opportunities and the challenges? In what ways do female characters support one another, compete, or adapt to succeed within that system?' },
        { theme: 'Friendship & Emotional Anchors', text: "How do Frances and Barbara each shape Joan's emotional journey and sense of self? In what ways do these relationships complement or challenge one another?" },
        { theme: 'Identity & Social Climate', text: 'How does the historical context shape the way LGBTQ+ characters navigate relationships, identity, and safety? In what ways does the story highlight both the constraints of the era and moments of quiet resistance or authenticity?' }
      ]
    },
    {
      id: 'nix', slug: 'the-nix',
      title: 'The Nix', author: 'Nathan Hill',
      genre: 'Fiction', pages: 625,
      date: '2026-05-19', location: 'Virtual · FaceTime',
      goodreads: 4.08,
      ratings: { joanna: null, kat: 3.5, lexey: null, mazhar: null, meesh: null, zyrian: null },
      coverClass: 'cover-1', coverEmblem: 'A Novel',
      questions: [
        { theme: 'Family & Perception', text: 'How does the story explore the idea that we never fully know our parents — or the versions of themselves they were before us? Did your perception of Faye shift as her backstory unfolded?' },
        { theme: 'Avoidance & Self-Sabotage', text: 'Samuel often feels stuck professionally, romantically, and emotionally despite wanting to change. How does the novel portray avoidance, procrastination, and fear of failure? Did you find Samuel frustrating, relatable, or both?' },
        { theme: 'Truth & Memory', text: 'The novel frequently reveals that memories are incomplete, biased, or reshaped over time. How does The Nix explore unreliability of memory? Were there moments where learning another character\'s perspective completely changed how you understood earlier events?' },
        { theme: 'Love & Emotional Dependency', text: 'Several relationships in the book are shaped by emotional need, insecurity, or idealized versions of love. How does the novel portray unhealthy attachment versus genuine connection? Which relationships felt most authentic — or most dysfunctional — to you?' },
        { theme: 'Folklore & Symbolism', text: 'The title refers to the folklore concept of the Nix — a spirit associated with loss, longing, and the idea of something taken away. What do you think the Nix symbolizes in the story? Is it a person, a feeling, a missed opportunity, or something else entirely?' }
      ]
    }
  ];

  const INITIAL_TBR = [
    { id: 't1', title: 'The Raven Scholar', author: 'Antonia Hodgson', genre: 'Fantasy', pages: 656, goodreads: 4.46, member: 'Katherine' },
    { id: 't2', title: 'The Nightingale', author: 'Kristin Hannah', genre: 'Historical Fiction', pages: 440, goodreads: 4.63, member: 'Katherine' },
    { id: 't3', title: 'Operation Bounce House', author: 'Matt Dinniman', genre: 'Science Fiction', pages: 437, goodreads: 4.04, member: 'Katherine' },
    { id: 't4', title: 'Medusa', author: 'Nataly Gruender', genre: 'Fantasy / Mythology', pages: 415, goodreads: 4.25, member: 'Lexey' },
    { id: 't5', title: 'When They Burned the Butterfly', author: 'Wen-Yi Lee', genre: 'Fantasy', pages: 462, goodreads: 3.86, member: 'Lexey' },
    { id: 't6', title: 'The Glass Castle', author: 'Jeannette Walls', genre: 'Memoir', pages: 288, goodreads: 4.33, member: 'Mazhar' },
    { id: 't7', title: 'The Devils', author: 'Joe Abercrombie', genre: 'Horror / Dark Fantasy', pages: 547, goodreads: 4.20, member: 'Mazhar' },
    { id: 't8', title: 'Gardens of the Moon', author: 'Steven Erikson', genre: 'Epic Fantasy', pages: 666, goodreads: 3.90, member: 'Mazhar' },
    { id: 't9', title: 'Lies of Locke Lamora', author: 'Scott Lynch', genre: 'Fantasy / Heist', pages: 530, goodreads: 4.30, member: 'Michelle' },
    { id: 't10', title: 'Yumi and the Nightmare Painter', author: 'Brandon Sanderson', genre: 'Fantasy', pages: 480, goodreads: 4.43, member: 'Michelle' },
    { id: 't11', title: 'Piranesi', author: 'Susanna Clarke', genre: 'Fantasy / Mystery', pages: 272, goodreads: 4.23, member: 'Zyrian' },
    { id: 't12', title: 'Katabasis', author: 'R. F. Kuang', genre: 'Fantasy', pages: 400, goodreads: 4.03, member: 'Zyrian' },
    { id: 't13', title: 'Frozen River', author: 'Ariel Lawhon', genre: 'Historical Fiction / Mystery', pages: 448, goodreads: 4.39, member: 'Zyrian' }
  ];

  // Ordered list of member-info questions shown on the Members page.
  // Each entry: { key, label, placeholder }
  const MEMBER_QUESTIONS = [
    { key: 'favoriteBook',         label: 'Favorite Book' },
    { key: 'worstBook',            label: 'Worst Book Ever Read' },
    { key: 'yaSeries',             label: 'Favorite YA Series Growing Up' },
    { key: 'favoriteGenre',        label: 'Favorite Genre' },
    { key: 'leastFavoriteGenre',   label: 'Least Favorite Genre' },
    { key: 'favoriteAuthor',       label: 'Favorite Author' },
    { key: 'favoriteTrope',        label: 'Favorite Trope' },
    { key: 'leastFavoriteTrope',   label: 'Least Favorite Trope' },
    { key: 'inLoveWith',           label: "Fictional Character You're In Love With" },
    { key: 'mostInspiring',        label: 'Most Inspiring Character' },
    { key: 'longestTbr',           label: 'Book That Has Been on Your TBR the Longest' },
    { key: 'wishMovie',            label: 'Book You Wish Was a Movie' },
    { key: 'wishTv',               label: 'Book You Wish Was a TV Show' },
    { key: 'bestAdaptation',       label: 'Best Book to TV/Movie Adaptation' },
    { key: 'hardcoverPaperback',   label: 'Hardcover or Paperback' },
    { key: 'readingFormat',        label: 'Preferred Reading Format' },
    { key: 'favoriteInfluencer',   label: 'Favorite Book Influencer' }
  ];

  const INITIAL_MEMBERS = [
    {
      id: 'joanna', name: 'Joanna', avatar: 'J', themeClass: 'theme-2',
      handle: 'Mystery devotee · Audiobook loyalist',
      answers: {
        favoriteBook: 'Anne of Green Gables', worstBook: '',
        yaSeries: 'Harry Potter, Artemis Fowl',
        favoriteGenre: 'Mystery, Psychological Thriller',
        leastFavoriteGenre: 'Horror', favoriteAuthor: '',
        favoriteTrope: '', leastFavoriteTrope: '',
        inLoveWith: '', mostInspiring: '',
        longestTbr: 'All The Light We Cannot See',
        wishMovie: '', wishTv: '', bestAdaptation: '',
        hardcoverPaperback: 'Paperback',
        readingFormat: 'Audiobook (would prefer physical book if I had the attention span 🙃)',
        favoriteInfluencer: ''
      }
    },
    {
      id: 'kat', name: 'Katherine', avatar: 'K', themeClass: 'theme-1',
      handle: '"Kat" · Sci-fi soul · Paper purist',
      answers: {
        favoriteBook: "Ender's Game", worstBook: 'The Spanish Love Deception',
        yaSeries: 'Percy Jackson & the Olympians',
        favoriteGenre: 'Science Fiction', leastFavoriteGenre: 'Romance',
        favoriteAuthor: 'R. F. Kuang, Octavia E. Butler',
        favoriteTrope: 'Slow Burn, Forced Proximity',
        leastFavoriteTrope: 'Fake Dating',
        inLoveWith: '', mostInspiring: 'Lauren Olamina',
        longestTbr: 'A Little Life',
        wishMovie: 'Project Hail Mary',
        wishTv: 'Dungeon Crawler Carl',
        bestAdaptation: 'Ready Player One',
        hardcoverPaperback: 'Paperback', readingFormat: 'Physical Book',
        favoriteInfluencer: ''
      }
    },
    {
      id: 'lexey', name: 'Lexey', avatar: 'L', themeClass: 'theme-3',
      handle: 'Sapphic smut SME · Will fight for Aelin',
      answers: {
        favoriteBook: 'Those Who Wait', worstBook: 'Engineering Design',
        yaSeries: 'Fifty Shades, LMAO',
        favoriteGenre: 'Sapphic Smut :)', leastFavoriteGenre: 'Horror',
        favoriteAuthor: 'Haley Cass',
        favoriteTrope: 'Enemies to Lovers',
        leastFavoriteTrope: 'Second Chance / Pregnancy',
        inLoveWith: '', mostInspiring: 'Aelin Ashryver W. Galathynius',
        longestTbr: 'Red Queen Series',
        wishMovie: 'The Women', wishTv: 'TOG Series',
        bestAdaptation: '',
        hardcoverPaperback: 'Paperback', readingFormat: 'Kindle, Audiobook',
        favoriteInfluencer: ''
      }
    },
    {
      id: 'mazhar', name: 'Mazhar', avatar: 'M', themeClass: 'theme-4',
      handle: '"Maz" · Tolkien defender · Hardcover only',
      answers: {
        favoriteBook: 'A Storm of Swords / LOTR', worstBook: '',
        yaSeries: 'Percy Jackson',
        favoriteGenre: 'Epic Fantasy', leastFavoriteGenre: 'Romance / Self Help',
        favoriteAuthor: 'Tolkien',
        favoriteTrope: '', leastFavoriteTrope: 'Resurrection / Fake Death',
        inLoveWith: '', mostInspiring: '',
        longestTbr: 'Crime and Punishment',
        wishMovie: 'Path of Destruction', wishTv: 'Worm',
        bestAdaptation: 'LOTR / The Expanse',
        hardcoverPaperback: 'Hardcover', readingFormat: 'Kindle',
        favoriteInfluencer: ''
      }
    },
    {
      id: 'meesh', name: 'Michelle', avatar: 'M', themeClass: 'theme-5',
      handle: '"Meesh" · Sanderson disciple · Kaladin apologist',
      answers: {
        favoriteBook: 'Words of Radiance', worstBook: 'Lightlark',
        yaSeries: 'Harry Potter',
        favoriteGenre: 'High / Epic Fantasy', leastFavoriteGenre: 'Self Help',
        favoriteAuthor: 'Brandon Sanderson',
        favoriteTrope: '(Slow Burn) Enemies to Lovers',
        leastFavoriteTrope: 'Fated Mates',
        inLoveWith: 'Kaladin Stormblessed <3',
        mostInspiring: '(maybe) Shallan Davar',
        longestTbr: '',
        wishMovie: 'Mistborn',
        wishTv: 'Stormlight Archives or Greenbone Saga',
        bestAdaptation: 'LOTR or Fight Club',
        hardcoverPaperback: 'Hardcover', readingFormat: 'Kindle',
        favoriteInfluencer: ''
      }
    },
    {
      id: 'zyrian', name: 'Zyrian', avatar: 'Z', themeClass: 'theme-6',
      handle: 'Mystery seeker · Kindle convert (no book space)',
      answers: {
        favoriteBook: '', worstBook: '',
        yaSeries: 'Percy Jackson / Artemis Fowl',
        favoriteGenre: 'Mystery / Fantasy', leastFavoriteGenre: 'Nonfiction',
        favoriteAuthor: '',
        favoriteTrope: '', leastFavoriteTrope: 'Fake Dating / Second Chance',
        inLoveWith: '', mostInspiring: 'Count Alexander Ilyich Rostov',
        longestTbr: 'Game of Thrones',
        wishMovie: 'House of Leaves', wishTv: 'TOG',
        bestAdaptation: 'Fight Club / Fantastic Mr. Fox',
        hardcoverPaperback: 'Paperback', readingFormat: 'Kindle (no book space)',
        favoriteInfluencer: ''
      }
    }
  ];

  /* ---------- Firestore init + real-time subscriptions ---------- */
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async function () {
      if (typeof firebase === 'undefined' || !firebase.apps.length) {
        throw new Error('Firebase is not initialized. Make sure firebase-init.js loaded successfully.');
      }
      db = firebase.firestore();
      booksCol = db.collection('books');
      tbrCol = db.collection('tbr');
      membersCol = db.collection('members');

      // Seed the database the first time anyone loads the site.
      const [booksSnap, tbrSnap, membersSnap] = await Promise.all([
        booksCol.limit(1).get(),
        tbrCol.limit(1).get(),
        membersCol.limit(1).get()
      ]);
      if (booksSnap.empty) {
        const batch = db.batch();
        INITIAL_BOOKS.forEach(b => batch.set(booksCol.doc(b.id), b));
        await batch.commit();
      }
      if (tbrSnap.empty) {
        const batch = db.batch();
        INITIAL_TBR.forEach(r => batch.set(tbrCol.doc(r.id), r));
        await batch.commit();
      }
      if (membersSnap.empty) {
        const batch = db.batch();
        INITIAL_MEMBERS.forEach(m => batch.set(membersCol.doc(m.id), m));
        await batch.commit();
      }

      // Subscribe for real-time updates. Resolve init() only after the first
      // snapshot of each collection lands so loadBooks/loadTbr/loadMembers are populated.
      let booksReady = false, tbrReady = false, membersReady = false;
      await new Promise(resolve => {
        const checkReady = () => { if (booksReady && tbrReady && membersReady) resolve(); };
        booksCol.onSnapshot(snap => {
          booksCache = snap.docs.map(d => d.data());
          if (!booksReady) { booksReady = true; checkReady(); }
          else triggerChange('books');
        }, err => console.error('books snapshot error:', err));
        tbrCol.onSnapshot(snap => {
          tbrCache = snap.docs.map(d => d.data());
          if (!tbrReady) { tbrReady = true; checkReady(); }
          else triggerChange('tbr');
        }, err => console.error('tbr snapshot error:', err));
        membersCol.onSnapshot(snap => {
          membersCache = snap.docs.map(d => d.data());
          if (!membersReady) { membersReady = true; checkReady(); }
          else triggerChange('members');
        }, err => console.error('members snapshot error:', err));
      });

      initialized = true;
    })();
    return initPromise;
  }

  function triggerChange(kind) {
    changeCallbacks.forEach(cb => { try { cb(kind); } catch (e) { console.error(e); } });
  }
  function onChange(cb) {
    changeCallbacks.push(cb);
    return function unsubscribe() {
      changeCallbacks = changeCallbacks.filter(c => c !== cb);
    };
  }

  /* ---------- Synchronous reads (return from cache) ---------- */
  function loadBooks()   { return booksCache.map(b => ({ ...b })); }
  function loadTbr()     { return tbrCache.map(r => ({ ...r })); }
  function loadMembers() { return membersCache.map(m => ({ ...m, answers: { ...(m.answers || {}) } })); }
  function memberQuestions() { return MEMBER_QUESTIONS.slice(); }

  /* ---------- Writes (async, fire and forget for callers) ---------- */
  function saveBooks(books) {
    if (!db) return Promise.reject(new Error('NSC not initialized — call NSC.init() first.'));
    const newIds = new Set(books.map(b => b.id));
    const batch = db.batch();
    books.forEach(b => batch.set(booksCol.doc(b.id), stripUndefined(b)));
    booksCache.forEach(b => { if (!newIds.has(b.id)) batch.delete(booksCol.doc(b.id)); });
    return batch.commit().catch(e => { console.error('saveBooks failed:', e); throw e; });
  }
  function saveTbr(rows) {
    if (!db) return Promise.reject(new Error('NSC not initialized — call NSC.init() first.'));
    const newIds = new Set(rows.map(r => r.id));
    const batch = db.batch();
    rows.forEach(r => batch.set(tbrCol.doc(r.id), stripUndefined(r)));
    tbrCache.forEach(r => { if (!newIds.has(r.id)) batch.delete(tbrCol.doc(r.id)); });
    return batch.commit().catch(e => { console.error('saveTbr failed:', e); throw e; });
  }
  function saveMember(member) {
    if (!db) return Promise.reject(new Error('NSC not initialized — call NSC.init() first.'));
    return membersCol.doc(member.id).set(stripUndefined(member))
      .catch(e => { console.error('saveMember failed:', e); throw e; });
  }
  function resetAll() {
    // Wipe everything and re-seed from INITIAL_*. Useful for testing.
    if (!db) return Promise.reject(new Error('NSC not initialized.'));
    const batch = db.batch();
    booksCache.forEach(b => batch.delete(booksCol.doc(b.id)));
    tbrCache.forEach(r => batch.delete(tbrCol.doc(r.id)));
    INITIAL_BOOKS.forEach(b => batch.set(booksCol.doc(b.id), b));
    INITIAL_TBR.forEach(r => batch.set(tbrCol.doc(r.id), r));
    return batch.commit();
  }

  // Firestore rejects writes containing `undefined` — sanitize before sending.
  function stripUndefined(obj) {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) return obj.map(stripUndefined);
    if (typeof obj === 'object') {
      const out = {};
      Object.entries(obj).forEach(([k, v]) => {
        if (v === undefined) return;
        out[k] = (v !== null && typeof v === 'object') ? stripUndefined(v) : v;
      });
      return out;
    }
    return obj;
  }

  function avgRating(book) {
    // Average across whatever member keys exist in book.ratings — agnostic
    // to which members are currently active.
    if (!book.ratings) return null;
    const vals = Object.values(book.ratings)
      .filter(v => typeof v === 'number' && !isNaN(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function memberList() {
    // Returns the active member roster, sorted alphabetically by name.
    // Falls back to the legacy hardcoded list if the members collection is empty.
    if (!membersCache.length) {
      return MEMBERS.map(id => ({ id, name: MEMBER_LABELS[id] || id }));
    }
    return membersCache.slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(m => ({ id: m.id, name: m.name }));
  }

  function numberToWord(n) {
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
      'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
      'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    if (Number.isInteger(n) && n >= 0 && n < words.length) return words[n];
    return String(n);
  }

  function slugify(s) {
    return s.toString().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function coverPath(book) {
    // Prefer explicit cover field; otherwise derive from slug.
    if (book.cover) return book.cover;
    return 'images/covers/' + (book.slug || slugify(book.title)) + '.jpg';
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatMonthYear(iso) {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  function yearOf(iso) {
    if (!iso) return null;
    return new Date(iso + 'T00:00:00').getFullYear();
  }

  function isUpcoming(book) {
    if (!book.date) return false;
    const d = new Date(book.date + 'T00:00:00');
    return d.getTime() > Date.now();
  }

  function bookCoverHTML(book, mini=false) {
    const src = coverPath(book);
    const cls = book.coverClass || 'cover-1';
    return `
      <div class="book-cover ${cls}${mini ? ' mini' : ''}">
        <img class="cover-img" src="${src}" alt="${escapeHtml(book.title)} cover" onerror="this.classList.add('broken')">
        <div class="cover-emblem">${escapeHtml(book.coverEmblem || book.genre || '')}</div>
        <div class="cover-title">${escapeHtml(book.title)}</div>
        <div class="cover-author">${escapeHtml(book.author)}</div>
      </div>`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  return {
    MEMBERS, MEMBER_LABELS,
    init, onChange,
    loadBooks, saveBooks, loadTbr, saveTbr, resetAll,
    loadMembers, saveMember, memberQuestions, memberList, numberToWord,
    avgRating, coverPath, formatDate, formatMonthYear, yearOf, isUpcoming,
    bookCoverHTML, escapeHtml, slugify
  };
})();
