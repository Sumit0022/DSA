// app/vision/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, HeartPulse, TrendingUp, Scale, Tractor, 
  UserPlus, Users, Building2, Leaf, ShieldCheck, 
  Cpu, Gavel, Globe2, Landmark, HardHat, 
  Palette, Beaker, Lock, Home, ScrollText, 
  Sparkles, CheckCircle2, ArrowRight
} from "lucide-react";

// ─── MASSIVE DATA PAYLOAD ───
const manifestoData = [
  {
    id: "preamble",
    title: "Preamble",
    subtitle: "A New Vision for a Stronger, Fairer, and More Prosperous India",
    icon: ScrollText,
    content: [
      "India stands at a defining moment in its history.",
      "We are a nation of immense potential, extraordinary diversity, and remarkable resilience. We are home to one of the world's youngest populations, one of its oldest civilizations, and one of its most vibrant democracies. Yet despite our achievements, millions of citizens continue to face challenges related to education, healthcare, employment, infrastructure, opportunity, and quality of life.",
      "The Democratic Social Alliance (DSA) was founded on a simple belief: that progress should be measured not only by economic growth, but by the opportunities available to ordinary citizens and the quality of life they experience every day.",
      "We believe that development must be inclusive, governance must be accountable, institutions must be strong, and opportunities must be accessible to all. We believe that every citizen deserves the chance to succeed regardless of their background, birthplace, income, or social circumstances.",
      "DSA is guided by the values enshrined in the Constitution of India. We remain committed to democracy, liberty, justice, dignity, transparency, accountability, and the rule of law. These principles are not merely political ideals; they are the foundation upon which a prosperous and united India can be built.",
      "We recognize that not all citizens begin from the same starting point. Therefore, DSA supports policies that promote equity of opportunity while preserving equal dignity for every individual. We believe that a just society is one in which barriers to advancement are reduced and every citizen has a genuine opportunity to achieve their potential.",
      "Our vision extends beyond short-term political cycles. We seek to build institutions that endure, infrastructure that improves daily life, educational systems that prepare future generations, healthcare systems that protect every family, and an economy that creates opportunities for all. We believe that government should not merely govern it should enable citizens to thrive.",
      "This manifesto represents our commitment to building an India that is more educated, healthier, safer, cleaner, more innovative, more prosperous, and more united.",
      "The Democratic Social Alliance does not offer a vision for a few. It offers a vision for every citizen who believes that India's future can be stronger than its present and brighter than its past. Together, we can build a nation where opportunity is real, institutions are trusted, communities are empowered, and progress is shared by all."
    ],
    bullets: []
  },
  {
    id: "education",
    title: "Education",
    subtitle: "Building the Foundation of a Knowledge-Driven India",
    icon: BookOpen,
    content: [
      "Education is the foundation upon which a nation builds its future. Every great nation in history has achieved progress by investing in the minds, skills, and capabilities of its people.",
      "The Democratic Social Alliance (DSA) believes that quality education should not be a privilege available only to a select few, but a right accessible to every citizen regardless of their economic background, social status, or geographic location.",
      "For decades, India's education system has witnessed significant expansion in enrollment and infrastructure. However, serious challenges continue to exist. While higher education institutions such as IITs, IIMS, AIIMS, and other premier institutes have established global reputations, the quality of primary and secondary education remains uneven across large parts of the country.",
      "DSA believes that previous governments have often focused on expanding access while paying insufficient attention to the quality of foundational learning. As a result, many students advance through the system without acquiring essential skills required for higher studies and employment.",
      "DSA believes that academic excellence and athletic excellence must grow together. A healthy nation requires both educated minds and healthy bodies. Therefore, sports infrastructure and physical development programs will receive equal importance alongside academics.",
      "DSA believes that the quality gap between elite institutions and ordinary institutions must be significantly reduced. Our vision is to establish national quality benchmarks inspired by the standards of IITs, IIMS, AIIMS, and other leading institutions and gradually extend these standards throughout the higher education ecosystem.",
      "Traditional academic education alone is no longer sufficient in a rapidly changing economy. Modern industries require practical skills, technical expertise, digital competencies, and adaptability. DSA believes that skill development must become an integral component of the education system rather than a separate pathway.",
      "DSA envisions an India where quality education is available to every child, every student has access to meaningful opportunities, and educational institutions become engines of innovation, social mobility, and national progress.",
      "Education is not merely an expenditure it is the most important investment a nation can make in its future."
    ],
    bullets: [
      "Construction of modern government schools equipped with digital classrooms, libraries, laboratories, sports facilities, and safe learning environments.",
      "Recruitment and continuous professional development of highly qualified teachers.",
      "Modernization of curriculum to promote critical thinking, problem-solving, communication skills, digital literacy, and scientific temperament.",
      "Integration of sports, physical education, arts, and extracurricular activities as essential components of education rather than optional additions.",
      "Development of new public institutions across every district of India over a long-term phased implementation plan.",
      "Stronger collaboration between academia and industry to improve employability and practical learning.",
      "Affordable access to quality higher education regardless of socioeconomic background.",
      "Integration of vocational and technical training within school and university curricula.",
      "Promotion of entrepreneurship, innovation, and self-employment opportunities."
    ]
  },
  {
    id: "healthcare",
    title: "Healthcare",
    subtitle: "Healthcare as a Right, Not a Privilege",
    icon: HeartPulse,
    content: [
      "A nation's progress cannot be measured solely by economic growth, infrastructure, or technological advancement. The true strength of a nation lies in the health and well-being of its people.",
      "DSA believes that access to quality healthcare should be a fundamental right available to every citizen, regardless of income, social background, or place of residence.",
      "Despite significant progress in recent decades, millions of Indians continue to face challenges in accessing affordable and quality healthcare. Many families are pushed into financial distress due to medical expenses, while rural and semi-urban regions often lack adequate healthcare infrastructure and specialist services.",
      "DSA believes that no citizen should be forced to choose between their health and their financial security.",
      "The quality of healthcare available to a citizen should not depend on whether they live in a metropolitan city or a remote district. Every Indian deserves access to modern hospitals, qualified doctors, advanced medical technology, and affordable treatment.",
      "Medical emergencies should not become financial emergencies. DSA proposes the creation and expansion of a comprehensive healthcare insurance framework designed to protect citizens from catastrophic medical expenses while ensuring access to quality treatment.",
      "Mental health has become one of the most important yet neglected public health challenges of the modern era. Stress, anxiety, depression, loneliness, addiction, and other psychological challenges affect millions of people across all age groups.",
      "DSA believes that mental health should receive the same level of attention and importance as physical health.",
      "DSA believes that preventing illness is often more effective and less expensive than treating it. A healthier population not only improves quality of life but also strengthens national productivity and reduces long-term healthcare costs.",
      "DSA envisions an India where quality healthcare is accessible, affordable, modern, and compassionate. No family should be pushed into poverty because of medical expenses, and no citizen should be denied treatment because of where they live or how much they earn."
    ],
    bullets: [
      "Development of advanced multi-specialty public hospitals in every district with infrastructure inspired by India's premier medical institutions.",
      "Expansion of healthcare facilities in rural and underserved regions.",
      "Improved doctor-to-patient ratios through expansion of medical education and training programs.",
      "Every citizen would be covered under a standardized healthcare protection system.",
      "Digital healthcare records would improve continuity and efficiency of treatment.",
      "Establishment of a nationwide mental healthcare network and affordable online consultations.",
      "Mental health awareness campaigns in schools, colleges, workplaces, and communities.",
      "Public health awareness programs, nutrition and fitness initiatives, and vaccination campaigns.",
      "Better working conditions for healthcare professionals and increased staffing in underserved regions."
    ]
  },
  {
    id: "economy",
    title: "Economy & Employment",
    subtitle: "Building an Economy That Works for Everyone",
    icon: TrendingUp,
    content: [
      "A strong economy is not measured solely by stock market performance, GDP growth, or corporate profits. A truly successful economy is one that creates opportunities, generates employment, encourages innovation, and improves the quality of life of ordinary citizens.",
      "DSA believes that economic growth and social development must progress together. Economic policies should not only benefit large corporations and urban centers but should also empower workers, entrepreneurs, small businesses, farmers, and local communities.",
      "Employment generation will be one of DSA's highest priorities. India possesses one of the world's youngest populations, creating both a tremendous opportunity and a significant challenge.",
      "DSA believes that sustainable job creation requires long-term investment in public infrastructure, education, healthcare, technology, manufacturing, and services.",
      "Micro, Small, and Medium Enterprises (MSMEs) form the backbone of the Indian economy. They generate employment, encourage innovation, and support local economic development. DSA believes that economic concentration should not undermine healthy competition.",
      "Economic growth should improve the lives of workers, not merely increase profits. DSA believes that Indian workers deserve safe workplaces, fair compensation, reasonable working hours, and strong labor protections.",
      "DSA believes that both private enterprise and public enterprise have important roles to play in national development. The objective is not state control of the economy but the creation of a competitive environment where public and private institutions work together to serve citizens.",
      "DSA believes that long-term fiscal strength should come from economic growth, productive investment, efficient public enterprises, innovation, and expansion of the tax base rather than excessive burdens on citizens.",
      "The global economy is rapidly changing due to artificial intelligence, automation, advanced manufacturing, biotechnology, renewable energy, and digital technologies. DSA believes India must become a leader rather than a follower in these transformations.",
      "DSA envisions an economy where growth creates opportunities for all, where businesses of every size can succeed, where workers are treated with dignity, and where public and private institutions contribute together to national development."
    ],
    bullets: [
      "Large-scale investment in educational institutions, healthcare infrastructure, transportation networks, and public utilities.",
      "Expansion of manufacturing and industrial clusters and support for emerging industries.",
      "Easier access to credit and financing, and simplified regulatory compliance procedures for MSMEs.",
      "Strengthening workplace safety standards and promoting fair wages and timely payment of salaries.",
      "Private enterprises are encouraged through fair competition while public sector enterprises are strengthened in strategically important sectors.",
      "Improving efficiency of public spending and expanding formal economic participation.",
      "Investment in emerging technologies, research-driven industrial development, and technology parks."
    ]
  },
  {
    id: "social-justice",
    title: "Social Justice & Equity",
    subtitle: "Creating a Society of Fair Opportunities",
    icon: Scale,
    content: [
      "DSA believes that the strength of a nation is measured not only by its economic progress but also by the fairness of the opportunities available to its people. A society cannot achieve its full potential if large sections of its population remain disadvantaged due to historical, social, economic, or institutional barriers.",
      "For decades, India has made significant progress in expanding access to education, employment, and political participation. However, deep inequalities continue to exist across regions, communities, genders, and economic groups.",
      "DSA believes that justice requires more than treating everyone identically. True justice requires creating conditions in which every individual has a genuine opportunity to succeed.",
      "One of the core principles of DSA is the distinction between equality and equity. Equality assumes that every individual begins from the same starting point and therefore should receive identical treatment. While equality remains an important democratic principle, DSA recognizes that real-world circumstances are often far more complex.",
      "Equity does not seek to guarantee identical outcomes for everyone. Instead, it seeks to ensure that every citizen has a fair opportunity to achieve success by addressing barriers that prevent equal participation.",
      "DSA supports affirmative action as a tool for expanding opportunity and correcting long-standing structural disadvantages. The ultimate goal of affirmative action is not division but the creation of a society where such interventions become less necessary because opportunities have become genuinely accessible to all.",
      "Many citizens possess extraordinary potential but lack access to quality education, mentorship, professional networks, financial resources, or career guidance. DSA believes that governments should actively work to remove these barriers and create pathways for advancement.",
      "A democratic society functions best when all citizens feel valued, respected, and represented. DSA rejects discrimination, exclusion, and social division in all forms.",
      "Social justice is not only about legal rights; it is also about economic opportunity. A citizen who lacks access to quality education, healthcare, employment opportunities, or financial security cannot fully exercise their freedoms.",
      "DSA believes that social justice and national unity are not opposing goals they strengthen one another. When citizens trust that institutions are fair, opportunities are accessible, and public policies are designed to serve everyone, social cohesion becomes stronger."
    ],
    bullets: [
      "Affirmative action policies should be transparent, evidence-based, and focused on expanding opportunities rather than creating dependency.",
      "Expanded educational support programs, scholarships, and talent development initiatives.",
      "Career guidance, mentorship systems, and skill development programs.",
      "Mutual respect among communities and equal dignity for every citizen.",
      "Investments in education, healthcare, housing, skill development, and employment as essential components of social justice."
    ]
  },
  {
    id: "agriculture",
    title: "Agriculture & Rural Dev",
    subtitle: "Empowering Farmers, Securing India's Future",
    icon: Tractor,
    content: [
      "Agriculture is not merely an economic sector-it is the foundation upon which India's civilization, culture, and food security have been built.",
      "DSA believes that national development cannot be complete unless rural development progresses alongside urban growth. A strong India requires prosperous farmers, modern villages, and sustainable agricultural systems.",
      "Farmers should not have to struggle for economic security despite feeding the nation. DSA believes that agricultural policy must focus on increasing farm income, reducing financial vulnerability, and improving the overall quality of life for farming families.",
      "One of the biggest challenges facing Indian agriculture is dependence on irregular rainfall and outdated farming practices. DSA believes that water security is agricultural security.",
      "Agriculture must evolve from a survival-based activity into a modern, technology-driven sector capable of meeting the demands of the future.",
      "The future of Indian agriculture depends upon scientific innovation. Scientific advancements should not remain confined to laboratories. Farmers across the country should benefit directly from research and innovation through effective knowledge transfer systems.",
      "For decades, rural development has often been limited to basic connectivity projects. DSA proposes a comprehensive rural infrastructure strategy focused on improving quality of life and economic opportunity.",
      "Villages should not be viewed solely as centers of agricultural production. They should become hubs of entrepreneurship, innovation, manufacturing, tourism, and local economic activity.",
      "India's food security depends upon the long-term sustainability of its agricultural system. Agricultural growth must be sustainable if it is to serve future generations.",
      "DSA envisions an India where farmers are economically secure, agriculture is technologically advanced, villages are modern and well-connected, and rural citizens enjoy opportunities comparable to those available in cities."
    ],
    bullets: [
      "Improving farmers' access to affordable credit, financial services, and crop insurance.",
      "Expansion of irrigation infrastructure across underserved regions and modernization of existing canal systems.",
      "Adoption of precision farming technologies, soil health monitoring, and climate-resilient farming methods.",
      "Development of climate-resilient crop varieties and agricultural biotechnology.",
      "High-quality road connectivity, reliable electricity, water supply, and modern healthcare facilities in rural areas.",
      "Development of rural industries, agro-processing units, and farmer producer organizations.",
      "Soil conservation initiatives, sustainable water management, and reduction of food wastage."
    ]
  },
  {
    id: "women",
    title: "Women's Empowerment",
    subtitle: "Empowering Half the Nation",
    icon: UserPlus,
    content: [
      "No society can achieve its full potential if half of its population faces barriers to safety, education, employment, leadership, and opportunity. The progress of women is directly linked to the progress of families, communities, and the nation as a whole.",
      "DSA believes that women's empowerment is not merely a social objective it is an economic, democratic, and developmental necessity.",
      "The first responsibility of any society is to ensure that its citizens feel safe in their homes, workplaces, educational institutions, public spaces, and digital environments. DSA believes that women's safety requires more than strict laws. It requires effective enforcement, responsive institutions, modern policing, safer infrastructure, and social awareness.",
      "Women represent one of India's greatest untapped sources of economic potential. DSA believes that increasing women's economic participation is essential for national prosperity.",
      "Democracy functions best when leadership reflects the diversity of the society it serves. DSA believes that women should be represented at every level of decision-making, including government, public institutions, businesses, educational organizations, and community leadership structures.",
      "The foundation of women's empowerment begins with education. Every girl should have the opportunity to pursue her ambitions regardless of her family's income, social background, or geographic location.",
      "Women's health is a critical component of national development. DSA believes that healthcare systems must address the unique needs of women throughout different stages of life.",
      "Women's empowerment is not achieved solely through government policy. It also requires cultural change, social awareness, and mutual respect. A modern and progressive society is one where women are valued not for prescribed roles but for their abilities, aspirations, and contributions.",
      "DSA envisions an India where every woman can live safely, pursue her ambitions freely, participate fully in economic life, and contribute meaningfully to public leadership. When women progress, the nation progresses."
    ],
    bullets: [
      "Strengthening law enforcement responses to crimes against women and expanding surveillance in public spaces.",
      "Faster investigation and prosecution of serious crimes, and enhanced support services for victims of violence.",
      "Equal access to education and skill development opportunities, and increased support for women entrepreneurs.",
      "Leadership development, mentorship programs, and increased opportunities for political participation.",
      "Universal access to quality education for girls and promotion of STEM participation.",
      "Improved access to maternal and reproductive healthcare support, and mental health services."
    ]
  },
  {
    id: "youth",
    title: "Youth Development",
    subtitle: "Investing in India's Greatest Strength",
    icon: Users,
    content: [
      "India possesses one of the youngest populations in the world. This demographic advantage presents an extraordinary opportunity to accelerate economic growth, technological innovation, cultural development, and national progress.",
      "DSA believes that youth are not merely the future of the nation they are active stakeholders in its present. Their ideas, energy, creativity, and ambition must be harnessed to build a stronger and more prosperous India.",
      "Employment remains one of the most important concerns for young people across the country. DSA believes that youth development and employment generation must be addressed together.",
      "India's diversity is one of its greatest strengths, yet many young people have limited opportunities to travel, experience different regions, and interact with people from different cultures and backgrounds. DSA proposes the introduction of a National Youth Mobility Program under which students and young citizens would be provided access to an affordable nationwide public transportation pass.",
      "A strong nation requires healthy citizens. DSA believes that sports should become an integral part of youth development policy. Sports should not be viewed solely as a professional career path but as an essential component of a healthy and balanced society.",
      "Democracy becomes stronger when young citizens actively participate in public life. DSA believes that youth should be encouraged not only to vote but also to engage in community service, public discussions, leadership programs, and democratic decision-making processes.",
      "The future economy will be driven by creativity, technology, and innovation. DSA supports the development of a strong entrepreneurial ecosystem that enables young people to transform ideas into businesses, products, and services.",
      "DSA recognizes the increasing importance of mental health, emotional well-being, and personal development in a rapidly changing world.",
      "DSA envisions an India where every young person has access to quality education, meaningful employment opportunities, affordable mobility, modern sports infrastructure, leadership development programs, and platforms for civic participation."
    ],
    bullets: [
      "Stronger integration of skill development with academic education and increased internship opportunities.",
      "Introduction of a National Youth Mobility Program to encourage educational and cultural exploration and promote national integration.",
      "Development of sports infrastructure at local, district, and state levels, and integration of sports into educational institutions.",
      "Leadership development initiatives, civic education programs, and youth advisory councils.",
      "Startup incubation programs, access to mentorship networks, and entrepreneurial training initiatives.",
      "Accessible mental health support systems, career guidance, and counseling services for youth."
    ]
  },
  {
    id: "infrastructure",
    title: "Infrastructure",
    subtitle: "Building Infrastructure That Improves Everyday Life",
    icon: Building2,
    content: [
      "Infrastructure is often measured through large projects, record-breaking highways, massive bridges, and iconic buildings. While such projects play an important role in national development, DSA believes that the true purpose of infrastructure is not to create headlines it is to improve the daily lives of citizens.",
      "A modern nation is not defined solely by its largest projects but by the quality of life experienced by ordinary people in their neighborhoods, villages, towns, and cities.",
      "Transportation infrastructure forms the backbone of economic activity and social mobility. DSA believes that infrastructure planning must prioritize convenience, connectivity, safety, and efficiency. Infrastructure should connect people to opportunities, not merely connect locations on a map.",
      "DSA believes that some of the most important infrastructure investments are often the least discussed. Millions of citizens are affected daily by inadequate drainage systems, poor waste management, polluted public spaces, insufficient parks, and unreliable public utilities.",
      "Access to clean water and proper sanitation remains one of the most important public infrastructure priorities. No modern nation can achieve sustainable development while neglecting water quality and sanitation.",
      "Rivers have historically served as the cultural, economic, and environmental lifelines of Indian civilization. DSA supports the responsible development of riverfront infrastructure where environmentally and economically feasible.",
      "Every citizen deserves access to safe, affordable, and dignified housing. DSA believes that housing policy should focus not only on increasing housing supply but also on creating complete communities.",
      "In the twenty-first century, digital connectivity is as important as physical connectivity. DSA believes that access to reliable internet and digital services should be considered essential infrastructure.",
      "Infrastructure should not be built solely for the present generation. It must also serve future generations. Every major infrastructure project should be evaluated not only on its construction cost but also on its long-term social, economic, and environmental impact."
    ],
    bullets: [
      "Development of efficient and affordable public transportation systems and expansion of last-mile connectivity solutions.",
      "Modern waste collection and disposal systems, and scientific waste processing and recycling facilities.",
      "Expansion of water treatment facilities, sewage treatment plants, and scientific wastewater management systems.",
      "Restoration and preservation of urban river ecosystems and development of public recreational spaces along river corridors.",
      "Expansion of affordable housing programs and development of mixed-use communities.",
      "Expansion of high-speed broadband networks, especially in rural and underserved regions.",
      "Environmental sustainability, energy efficiency, and climate resilience in infrastructure planning."
    ]
  },
  {
    id: "environment",
    title: "Environment",
    subtitle: "Building a Cleaner, Greener, and Sustainable India",
    icon: Leaf,
    content: [
      "Economic growth and environmental protection should not be viewed as opposing objectives. A truly developed nation is one that balances prosperity with sustainability and ensures that future generations inherit a healthier, cleaner, and more resilient environment.",
      "DSA believes that environmental protection is not merely the responsibility of governments-it is a shared responsibility of citizens, institutions, businesses, and communities.",
      "Air pollution and water contamination have become major challenges in many parts of the country. Clean air and clean water should not be considered luxuries available only in a few locations. They should be basic standards enjoyed by every citizen.",
      "Environmental protection cannot be achieved through government action alone. DSA proposes the development of a nationwide civic participation program focused on cleanliness, environmental awareness, and community responsibility.",
      "Plastic pollution has become one of the most visible environmental challenges facing modern India. The objective is not simply to remove existing waste but to reduce future waste generation through sustainable consumption practices.",
      "India's future energy security depends upon the successful transition toward cleaner and more sustainable energy sources. DSA strongly supports the expansion of renewable energy infrastructure, particularly solar energy.",
      "Climate change presents one of the greatest long-term challenges facing humanity. DSA believes that climate resilience must become a core component of infrastructure and development planning.",
      "DSA proposes the gradual integration of environmental sustainability into transportation and infrastructure development. The objective is to create infrastructure that serves both people and nature.",
      "Lasting environmental progress requires awareness and participation. Environmental responsibility should become a shared cultural value rather than a regulatory obligation."
    ],
    bullets: [
      "Expansion of modern waste management systems and protection of rivers, lakes, and water bodies.",
      "Citizens will be encouraged to participate in regular local cleanliness drives.",
      "Expansion of recycling infrastructure and stronger enforcement against illegal dumping.",
      "Increased investment in solar power generation and promotion of rooftop solar systems.",
      "Integration of climate adaptation measures into public infrastructure projects and improved disaster preparedness.",
      "Large-scale tree plantation programs, expansion of green corridors, and development of urban forests.",
      "Inclusion of environmental education throughout the educational system."
    ]
  },
  {
    id: "governance",
    title: "Governance & Democracy",
    subtitle: "Trust, Transparency, and Accountability",
    icon: ShieldCheck,
    content: [
      "A nation's success depends not only on economic growth and infrastructure development but also on the strength of its institutions and the trust citizens place in them. Democracy flourishes when governments are accountable, institutions are independent, and citizens actively participate in public life.",
      "DSA believes that democracy is far more than a system of elections. It is a continuous partnership between citizens and the institutions that serve them.",
      "Public office is a position of responsibility, not privilege. DSA believes that governments and public institutions must operate with the highest standards of transparency and accountability.",
      "Strong institutions are essential for a healthy democracy. DSA believes that key public institutions must be protected from unnecessary political interference and should be led by individuals selected on the basis of competence, integrity, experience, and professional merit.",
      "A healthy democracy requires continuous improvement of its electoral processes. DSA believes that major electoral reforms should be developed through broad consultation and democratic consensus rather than unilateral action.",
      "Democracy is strongest when citizens actively engage in public affairs rather than participating only during elections. A democratic government should listen to its people continuously, not only during election campaigns.",
      "Technology offers significant opportunities to improve efficiency, transparency, and accessibility in public administration. DSA supports the responsible use of digital technologies to modernize governance.",
      "Many public challenges are best addressed at the local level. DSA believes that local governments should be empowered with the resources, authority, and capacity necessary to respond effectively to the needs of their communities.",
      "Citizens deserve a government that is responsive, efficient, and solution-oriented. Government should be a facilitator of opportunity rather than an obstacle to progress.",
      "The Constitution of India provides the foundation upon which our democratic system is built. Every public policy and institutional reform should be guided by these enduring principles."
    ],
    bullets: [
      "Strengthening transparency in public decision-making and regular performance audits of public institutions.",
      "Merit-based appointments to important institutional leadership positions and protection of professional decision-making.",
      "Improvement of electoral transparency and efficiency through dialogue between national and regional political parties.",
      "Expansion of public consultation mechanisms and digital platforms for citizen feedback.",
      "Expansion of online government services and simplification of administrative procedures.",
      "Strengthening local governance institutions and increasing community participation in local development.",
      "Improving public service delivery, reducing bureaucratic delays, and promoting performance-based evaluation systems."
    ]
  },
  {
    id: "technology",
    title: "Technology & Innovation",
    subtitle: "Building India's Future Through Innovation",
    icon: Cpu,
    content: [
      "Throughout history, technological innovation has been one of the most powerful drivers of economic growth, national security, social progress, and human development.",
      "DSA believes that India must not merely adopt technologies developed elsewhere-it must become a global leader in creating the technologies that will shape the future.",
      "Technology has the potential to transform the relationship between citizens and government. DSA believes that public services should be accessible, transparent, efficient, and convenient.",
      "No country can become a global technological leader without strong investment in research and development. Research should not remain confined to academic publications. It should generate practical solutions that improve lives, strengthen industries, and create economic opportunities.",
      "Artificial Intelligence (AI), robotics, quantum computing, biotechnology, advanced manufacturing, and other emerging technologies will define the global economy of the future. DSA believes that India must position itself at the forefront of these technological transformations.",
      "India's future economic growth will increasingly depend upon knowledge-intensive industries and innovation-driven enterprises. Our objective is to transform India from a major consumer of technology into a major producer of technology.",
      "Modern economies depend upon critical technologies such as semiconductors, advanced computing systems, telecommunications infrastructure, and strategic digital platforms. DSA believes that technological self-reliance is an important component of national resilience and economic security.",
      "Preparing citizens for the future economy requires transforming how education and training are delivered.",
      "Technology should not benefit only a small segment of society. Technology should be a tool for reducing barriers, expanding opportunities, and improving quality of life for all citizens.",
      "Technological progress must be guided by ethical principles and democratic values. Innovation should strengthen human freedom and dignity rather than undermine them."
    ],
    bullets: [
      "Unified digital platforms for citizen services and faster processing of government applications.",
      "Increased public investment in scientific research and development of world-class research universities.",
      "Development of a comprehensive national AI ecosystem and responsible deployment of emerging technologies.",
      "Expansion of the startup ecosystem, development of high-technology manufacturing industries, and promotion of technology exports.",
      "Expansion of domestic semiconductor manufacturing capabilities and investment in advanced electronics production.",
      "Integration of technology education at all levels, expansion of coding and digital literacy programs, and strengthening STEM education.",
      "Transparent AI governance frameworks, protection against algorithmic discrimination, and human oversight of critical automated decisions."
    ]
  },
  {
    id: "justice",
    title: "Law & Justice",
    subtitle: "Ensuring Justice, Security, and Trust",
    icon: Gavel,
    content: [
      "The rule of law is one of the fundamental pillars of a democratic society. Citizens can only enjoy their rights, freedoms, and opportunities when they have confidence that laws are applied fairly, justice is delivered efficiently, and public institutions operate with integrity.",
      "DSA believes that justice delayed is often justice denied. At the same time, public safety cannot be achieved solely through stricter laws-it requires efficient institutions, professional law enforcement, accessible legal systems, and strong protections for victims.",
      "India's judicial system has played a vital role in protecting constitutional values and individual rights. However, millions of pending cases continue to place enormous pressure on courts. DSA believes that judicial efficiency must become a national priority.",
      "Justice should not be accessible only to those with significant financial resources. DSA believes that every citizen should have the ability to understand their rights and access legal remedies when necessary.",
      "Law enforcement agencies are among the most visible institutions of government. DSA believes that modern policing should be professional, accountable, technologically equipped, and community-oriented.",
      "Public confidence in law enforcement depends upon impartiality and professionalism. Citizens should have confidence that law enforcement agencies operate fairly and impartially.",
      "Technology has created new opportunities but also new risks. Protecting citizens in the digital world is becoming as important as protecting them in the physical world.",
      "The justice system should not focus solely on offenders. It must also support those who have suffered harm. DSA believes that victims of crime deserve dignity, protection, and assistance throughout the legal process.",
      "Public safety depends upon effective emergency response systems. Citizens should be able to rely upon public institutions during emergencies, disasters, and times of crisis.",
      "DSA believes that public safety and individual liberty are not opposing goals. A democratic society must protect citizens from crime and violence while also safeguarding fundamental rights, due process, privacy, and constitutional protections."
    ],
    bullets: [
      "Expansion of judicial infrastructure, appointment of additional judges, and greater use of technology in court administration.",
      "Expansion of legal aid services, simplified legal procedures, and digital platforms to navigate legal processes.",
      "Modernization of police infrastructure, expansion of forensic capabilities, and strengthening community policing initiatives.",
      "Transparent administrative processes, strong accountability mechanisms, and improved oversight systems for policing.",
      "Expansion of cybersecurity capabilities and specialized cybercrime investigation units.",
      "Improved victim assistance programs, access to counseling, and protection mechanisms for vulnerable victims and witnesses.",
      "Strengthening emergency communication infrastructure and better coordination among emergency services."
    ]
  },
  {
    id: "foreign-policy",
    title: "Foreign Policy",
    subtitle: "Protecting India's Interests in a Changing World",
    icon: Globe2,
    content: [
      "In an increasingly interconnected world, a nation's security, prosperity, and global influence depend upon its ability to navigate complex international relationships while protecting its national interests. Foreign policy is no longer limited to diplomacy alone; it influences trade, technology, energy security, defense cooperation, climate policy, and economic development.",
      "DSA believes that India's foreign policy should be guided by strategic independence, national interest, democratic values, and long-term global engagement. India must build strong partnerships across the world while maintaining the ability to make independent decisions based on its own priorities.",
      "India's position in the world is unique. DSA supports a foreign policy based on strategic autonomy in international decision-making and strong diplomatic engagement with all major global powers.",
      "India's progress is closely connected to stability and cooperation within its neighborhood. A stable and prosperous neighborhood contributes directly to India's security and economic development.",
      "Foreign policy should contribute directly to economic growth and national development. Economic diplomacy should create jobs, increase prosperity, and strengthen India's position in the global economy.",
      "National sovereignty and territorial integrity are non-negotiable. DSA believes that securing India's borders is one of the most important responsibilities of the state.",
      "India's armed forces have consistently demonstrated professionalism, courage, and dedication in protecting the nation. DSA believes that they must be supported with the resources, technology, and infrastructure necessary to meet future challenges.",
      "DSA supports the long-term goal of increasing India's self-reliance in critical sectors related to national security. Self-reliance does not mean isolation. It means building the capabilities necessary to protect national interests while remaining an active participant in the global community.",
      "Modern national security extends beyond military considerations. A resilient nation must be capable of responding effectively to both traditional and non-traditional security challenges.",
      "DSA believes that India should aspire to become a leading voice for peace, development, innovation, democratic values, and international cooperation. India's rise should contribute not only to national prosperity but also to global progress."
    ],
    bullets: [
      "Strategic autonomy in international decision-making and active participation in international organizations.",
      "Peaceful engagement with neighboring countries and increased regional trade and connectivity.",
      "Economic diplomacy aimed at attracting investment, expanding export opportunities, and improving access to energy resources.",
      "Modernization of border infrastructure and investment in advanced border management technologies.",
      "Investment in advanced military technologies, modernization of equipment, and strengthening cybersecurity.",
      "Expansion of domestic defense production and development of indigenous technologies.",
      "Commitment to peaceful resolution of disputes and promotion of sustainable development globally."
    ]
  },
  {
    id: "taxation",
    title: "Taxation & Finance",
    subtitle: "A Fair, Efficient, and Sustainable Fiscal System",
    icon: Landmark,
    content: [
      "Taxes are the foundation upon which governments build public services, infrastructure, healthcare systems, educational institutions, and national development programs. However, taxation should be designed in a manner that is fair, transparent, efficient, and supportive of economic growth.",
      "DSA believes that the objective of taxation is not simply to maximize government revenue but to create a sustainable fiscal system that enables development while minimizing unnecessary burdens on citizens and businesses.",
      "A taxation system should be understandable, predictable, and equitable. DSA believes that citizens should contribute to national development through taxation, but governments also have a responsibility to ensure that tax systems remain reasonable, transparent, and efficient.",
      "DSA believes that sustainable government revenue is best achieved through economic expansion rather than excessive taxation. A larger and more prosperous economy allows governments to collect revenue more efficiently while maintaining fairness for taxpayers.",
      "Every rupee collected from taxpayers should be treated as a public trust. DSA believes that governments must focus not only on revenue generation but also on how effectively public funds are utilized. The success of public spending should be measured by outcomes achieved rather than funds allocated.",
      "DSA believes that strategically managed public enterprises can play an important role in national development. Public sector enterprises should operate professionally, efficiently, and competitively while serving public interests.",
      "DSA believes that governments should manage public finances responsibly and sustainably. Economic growth should be supported through sound financial management rather than excessive borrowing or short-term policy decisions.",
      "Corruption weakens institutions, increases costs, reduces public trust, and undermines development. DSA believes that fighting corruption requires strong institutions, transparent systems, and effective accountability mechanisms.",
      "Technology can significantly improve the efficiency and transparency of public finance management. Digital governance can help ensure that public resources are used more effectively and responsibly.",
      "Public finance should not focus solely on current expenditures. It should also prepare the nation for future challenges and opportunities through strategic investments."
    ],
    bullets: [
      "Simplification of tax administration, reduction of unnecessary compliance burdens, and promotion of voluntary tax compliance.",
      "Encouraging entrepreneurship, supporting formalization of economic activity, and expanding financial inclusion.",
      "Performance-based evaluation of major government programs and greater transparency in public procurement.",
      "Professional management practices and modernization of viable public enterprises.",
      "Responsible management of public debt and sustainable funding of major development programs.",
      "Increased transparency in government operations, digitization of public services, and independent investigation of corruption.",
      "Expansion of digital financial administration systems and real-time monitoring of public expenditure."
    ]
  },
  {
    id: "labor",
    title: "Labor & Social Security",
    subtitle: "A Dignified Future for Every Worker",
    icon: HardHat,
    content: [
      "Workers are the foundation of every economy. From farmers and factory workers to teachers, healthcare professionals, engineers, delivery personnel, and entrepreneurs, the prosperity of a nation depends upon the efforts of its people.",
      "DSA believes that economic growth should improve the lives of workers and their families. Development cannot be considered successful if prosperity is concentrated among a small segment of society while millions continue to face economic insecurity, unsafe working conditions, and inadequate social protection.",
      "Life is unpredictable. DSA believes that a modern society must provide a reasonable safety net that protects citizens from falling into extreme hardship during difficult circumstances.",
      "Every worker has the right to return home safely at the end of the day. DSA believes that workplace safety should never be compromised for economic gain.",
      "DSA believes that workers deserve fair treatment, reasonable working conditions, and respect for their contributions. Economic success should be shared by those whose labor makes it possible.",
      "Every individual who contributes to society throughout their working life deserves financial security during retirement. DSA supports the strengthening of pension and retirement systems.",
      "A significant portion of India's workforce operates outside traditional employment structures. DSA supports efforts to gradually expand social protection mechanisms to ensure economic security is not limited only to workers in formal employment.",
      "Women's participation in the workforce is essential for economic growth and social progress. A stronger workforce requires the full participation of all citizens.",
      "Technological advancements, automation, and changing economic conditions are transforming labor markets across the world. DSA believes that workers should be supported as industries evolve.",
      "DSA rejects the false choice between worker welfare and economic development. Economic growth and labor welfare should strengthen one another rather than compete against one another."
    ],
    bullets: [
      "Expansion of social security coverage and simplified access to government support services.",
      "Strengthening occupational safety standards, improved enforcement, and regular safety inspections.",
      "Promotion of fair wages, timely payment of salaries, and reduction of exploitative labor practices.",
      "Expansion of pension coverage and sustainable long-term pension management.",
      "Gradual expansion of social protection mechanisms for informal sector workers, gig workers, and freelancers.",
      "Policies that encourage female workforce participation, including safe workplaces and equal opportunities.",
      "Continuous skill development opportunities, workforce retraining programs, and support for career transitions."
    ]
  },
  {
    id: "culture",
    title: "Culture & Heritage",
    subtitle: "Preserving Heritage, Celebrating Diversity",
    icon: Palette,
    content: [
      "India is one of the world's oldest and most diverse civilizations. Across thousands of years, countless cultures, languages, traditions, philosophies, religions, artistic movements, and social customs have contributed to the nation's identity.",
      "DSA believes that cultural heritage should be preserved, celebrated, and passed on to future generations. At the same time, cultural diversity should serve as a source of unity, mutual understanding, and national pride.",
      "India's historical monuments, archaeological sites, traditional knowledge systems, literature, architecture, and cultural practices are invaluable national assets. Future generations should inherit a rich and well-preserved cultural legacy.",
      "Art, literature, music, theatre, cinema, and other creative expressions enrich society and strengthen cultural identity. DSA believes that artistic and literary communities play a vital role in preserving cultural heritage.",
      "India is home to some of the world's most influential religious and philosophical traditions. DSA believes that citizens should have the opportunity to learn about the beliefs, philosophies, histories, and cultural traditions of different faiths in an educational and respectful manner.",
      "India's diversity is one of the greatest examples of coexistence in human history. DSA believes that every citizen should feel proud of their own traditions while also appreciating the traditions of others.",
      "DSA believes that social harmony is strengthened when citizens interact with one another beyond political, religious, linguistic, and regional boundaries. National unity does not require cultural uniformity.",
      "A free society must allow citizens to express their cultural, artistic, linguistic, and religious identities peacefully and respectfully. A confident nation does not fear diversity it embraces it.",
      "Culture and heritage are not only social assets but also economic assets. By protecting and promoting its heritage, India can create employment opportunities while strengthening its cultural identity."
    ],
    bullets: [
      "Restoration and conservation of historical monuments and digitization of important historical records.",
      "Increased support for artists, writers, and cultural institutions, and promotion of regional languages.",
      "Development of voluntary educational programs focused on religious and philosophical literacy.",
      "Cultural diversity is celebrated and regional identities strengthen rather than weaken national unity.",
      "Cultural exchange programs, educational visits, and intercultural dialogue and cooperation.",
      "Protection of cultural expression and preservation of linguistic diversity.",
      "Expansion of heritage tourism and development of cultural industries."
    ]
  },
  {
    id: "science",
    title: "Science & Research",
    subtitle: "A Nation Driven by Knowledge and Discovery",
    icon: Beaker,
    content: [
      "Throughout history, scientific discovery has transformed civilizations, improved living standards, strengthened economies, and expanded humanity's understanding of the world. Nations that invest in science and research are better equipped to solve complex challenges, create new industries, improve public services, and secure long-term prosperity.",
      "DSA believes that scientific progress is not a luxury reserved for developed nations it is a necessity for any country that seeks to lead in the twenty-first century.",
      "Innovation is the engine of progress. DSA believes that scientific research should not be viewed as an isolated academic activity but as a strategic national investment.",
      "Many talented students and researchers leave scientific careers due to limited opportunities, inadequate resources, and uncertain career pathways. DSA believes that India must cultivate a stronger research culture.",
      "World-class research requires sustained investment. DSA believes that research funding should be viewed as a long-term investment rather than a short-term expense. Stable and predictable funding allows researchers to focus on discovery.",
      "India's achievements in space exploration have demonstrated the nation's scientific capabilities and technological potential. DSA believes that the space sector can play a transformative role in scientific advancement.",
      "The next generation of scientific breakthroughs will emerge from fields that are rapidly transforming the global economy and society. India must actively participate in these emerging scientific frontiers.",
      "Scientific research should contribute directly to solving national challenges. By aligning scientific research with national priorities, India can accelerate development.",
      "The success of a scientific ecosystem depends on the people who drive it. Talented researchers should see India not merely as a place to study but as a place where they can build world-class careers.",
      "The Constitution of India encourages the development of scientific temper, humanism, and the spirit of inquiry. A scientifically informed society is better equipped to make decisions."
    ],
    bullets: [
      "Expanding scientific research institutions and accelerating the commercialization of scientific discoveries.",
      "Strengthening science education at all levels and expanding opportunities for young researchers.",
      "Increased public investment in scientific research with competitive, merit-based funding mechanisms.",
      "Continued support for space exploration programs and expansion of satellite technology.",
      "Investment in AI, Biotechnology, Quantum Computing, Renewable Energy, and Nanotechnology.",
      "Research institutions encouraged to address public healthcare, agricultural productivity, and water security.",
      "Competitive research careers, modern research facilities, and reduced bureaucratic obstacles for scientists.",
      "Promotion of scientific literacy, evidence-based decision-making, and public understanding of science."
    ]
  },
  {
    id: "digital-rights",
    title: "Digital Rights & Privacy",
    subtitle: "Protecting Freedom and Privacy in the Digital Age",
    icon: Lock,
    content: [
      "The digital revolution has transformed the way people communicate, learn, work, conduct business, and interact with governments. Technology has created unprecedented opportunities for economic growth, innovation, and social development.",
      "DSA believes that the digital future must be built upon the same democratic principles that guide the physical world: liberty, dignity, accountability, transparency, and respect for individual rights.",
      "In the modern world, personal data has become one of the most valuable resources. DSA believes that individuals should have meaningful control over their personal information. Citizens should not be forced to sacrifice privacy in order to participate in the digital economy.",
      "DSA believes that technological advancement and individual privacy can coexist. The objective is to ensure that technology serves citizens rather than undermining their freedoms.",
      "As digital systems become increasingly integrated into everyday life, cybersecurity becomes a matter of national importance. A secure digital environment is essential for economic growth, technological innovation, and public trust.",
      "The internet has become one of the most important platforms for communication, education, creativity, and democratic participation. DSA believes that citizens should have the freedom to access information, express opinions, engage in public discourse, and participate in digital communities.",
      "In the twenty-first century, digital connectivity is no longer a luxury it is a necessity. DSA believes that every citizen should have access to reliable digital infrastructure regardless of location or economic status.",
      "Technology can only empower citizens if they possess the knowledge and skills required to use it effectively. A digitally informed population is better equipped to benefit from technological progress.",
      "Artificial Intelligence and automated systems are rapidly transforming society. DSA believes that technological innovation should be guided by ethical principles and democratic values.",
      "The digital economy will be one of the primary drivers of future economic growth. A thriving digital economy can create employment opportunities, strengthen competitiveness, and improve public services."
    ],
    bullets: [
      "Strong legal safeguards for personal data and protection against unauthorized access and misuse.",
      "Transparent oversight mechanisms for sensitive data practices and legal standards governing digital surveillance.",
      "Strengthening national cybersecurity capabilities and protection of critical digital infrastructure.",
      "Open access to information, protection of lawful digital expression, and promotion of responsible online behavior.",
      "Expansion of broadband connectivity across urban and rural regions, and affordable internet access initiatives.",
      "Nationwide efforts to improve digital literacy, cybersecurity awareness, and media literacy.",
      "Transparent AI governance frameworks and protection against algorithmic discrimination.",
      "Growth of digital entrepreneurship, innovation in financial technology, and expansion of digital commerce."
    ]
  },
  {
    id: "urban",
    title: "Urban Development",
    subtitle: "Building Cities Designed for People",
    icon: Home,
    content: [
      "Cities are engines of economic growth, innovation, culture, and opportunity. As India continues to urbanize rapidly, the quality of urban planning will play a decisive role in determining the quality of life enjoyed by millions of citizens.",
      "DSA believes that urban development should not be measured solely by population growth, skyscrapers, or commercial expansion. A successful city is one that is clean, efficient, beautiful, sustainable, and designed around the needs of its residents.",
      "The concept of a smart city should extend beyond technology and digital systems. DSA believes that truly smart cities are those that provide citizens with efficient services, clean environments, accessible transportation, safe public spaces, and a high quality of life.",
      "DSA believes that urban aesthetics are often overlooked in development planning despite their significant impact on public well-being, tourism, civic pride, and overall quality of life. Citizens should feel proud of the cities in which they live.",
      "Access to safe and affordable housing remains one of the most important urban challenges facing modern India. DSA believes that every family deserves access to dignified housing that is connected to essential services.",
      "One of the most visible indicators of urban governance is cleanliness. DSA believes that waste management must become a core component of urban development rather than an afterthought.",
      "Rapid urbanization requires transportation systems that are efficient, affordable, and environmentally sustainable. Cities should be designed to move people efficiently rather than simply accommodate increasing numbers of vehicles.",
      "Strong communities require strong public spaces. DSA believes that parks, plazas, community centers, sports facilities, libraries, and cultural venues play an essential role in improving social cohesion and quality of life.",
      "Urban growth must be environmentally sustainable and resilient to future challenges. Future urban development should balance economic growth with environmental responsibility.",
      "Successful cities require responsive governance and active citizen involvement. DSA believes that urban residents should have opportunities to participate in decisions affecting their neighborhoods and communities."
    ],
    bullets: [
      "Integrated urban planning, efficient public transportation systems, and smart utility management.",
      "Attractive public spaces, high-quality urban landscaping, and preservation of architectural character.",
      "Expansion of affordable housing programs and development of mixed-income communities.",
      "Scientific waste collection systems, modern recycling facilities, and waste segregation at source.",
      "Expansion of public transit networks, pedestrian-friendly urban design, and cycling infrastructure.",
      "Expansion of accessible public spaces, recreational infrastructure, and community-focused urban design.",
      "Energy-efficient urban development, green building practices, and climate-resilient infrastructure.",
      "Greater transparency in urban administration, citizen engagement platforms, and data-driven urban planning."
    ]
  },
  {
    id: "constitution",
    title: "Constitutional Values",
    subtitle: "The Foundation of Our Vision",
    icon: ShieldCheck,
    content: [
      "Every nation is guided by a set of principles that define its identity, aspirations, and direction. For India, these principles are enshrined in the Constitution of India a document that reflects the collective hopes, values, and democratic commitments of the nation.",
      "DSA believes that the Constitution is not merely a legal framework for governance. It is a social contract that binds together a diverse population through shared values, democratic institutions, and common aspirations.",
      "Democracy is one of India's greatest achievements. DSA believes that democracy is not limited to elections or political competition. True democracy exists when citizens have the ability to participate meaningfully in public life.",
      "Individual liberty is one of the cornerstones of a free society. DSA believes that citizens should be free to think, speak, learn, create, worship, associate, and pursue their aspirations without unnecessary interference.",
      "Justice is essential for social stability, economic opportunity, and democratic legitimacy. DSA believes that justice must be accessible, timely, and meaningful.",
      "A democracy can only remain strong if its citizens understand the rights, responsibilities, and values upon which it is built. DSA believes that constitutional literacy should become a national priority.",
      "DSA recognizes that the Constitution seeks to create a society based on dignity, fairness, and justice. We believe that every citizen deserves equal dignity and respect.",
      "India's diversity is one of its greatest strengths. DSA believes that national unity should be built upon mutual respect, shared citizenship, constitutional values, and common aspirations rather than uniformity.",
      "DSA believes that governments must operate within constitutional limits and remain accountable to the people they serve.",
      "The Constitution provides India with more than a system of government-it provides a vision of what the nation can become."
    ],
    bullets: [
      "Protection of free and fair electoral processes, strong democratic institutions, and active citizen participation.",
      "Protection of fundamental freedoms, privacy, personal rights, and freedom of thought, expression, and belief.",
      "Social justice through fair opportunities, economic justice, and equal treatment before the law.",
      "Increased public awareness of constitutional rights, civic education programs, and informed citizenship.",
      "Equal dignity for every citizen combined with policies that promote social mobility and inclusion.",
      "Respect for diversity, social harmony, mutual understanding, and national solidarity.",
      "Respect for the rule of law, protection of institutional independence, and transparency in governance."
    ]
  }
];

export default function VisionPage() {
  const [activeTab, setActiveTab] = useState(manifestoData[0].id);

  // Smooth scroll reference to top of content when tab changes (mobile)
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 768) {
       contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeContent = manifestoData.find(m => m.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* ─── HERO SECTION ─── */}
      <header className="bg-white border-b border-slate-200 py-16 md:py-24 text-center px-6 relative overflow-hidden">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
         
         <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 mb-6">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-700">The Official Document</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-4 text-slate-900">
               A New Vision for India
            </h1>
            <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto">
               The ideological foundation, strategic priorities, and complete manifesto of the Democratic Social Alliance.
            </p>
         </div>
      </header>

      {/* ─── READER LAYOUT ─── */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 flex flex-col md:flex-row gap-8 lg:gap-12 relative items-start">
         
         {/* LEFT SIDEBAR (Desktop) / TOP HORIZONTAL BAR (Mobile) */}
         <div className="w-full md:w-1/3 lg:w-1/4 shrink-0 md:sticky md:top-24 z-20 bg-slate-50 md:bg-transparent">
            {/* Mobile Scrollable Row */}
            <div className="flex md:hidden overflow-x-auto hide-scrollbar gap-2 pb-4 snap-x">
               {manifestoData.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`snap-start shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-all border ${
                      activeTab === item.id 
                        ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <item.icon className="w-4 h-4" /> {item.title}
                  </button>
               ))}
            </div>

            {/* Desktop Vertical List */}
            <div className="hidden md:flex flex-col gap-1 pr-4 max-h-[calc(100vh-140px)] overflow-y-auto hide-scrollbar">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 px-3">Table of Contents</h3>
               {manifestoData.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all text-left group ${
                      activeTab === item.id 
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200" 
                        : "text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 border border-transparent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                       activeTab === item.id ? "bg-blue-100 text-blue-600" : "bg-white border border-slate-200 text-slate-400 group-hover:text-slate-600"
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    {item.title}
                  </button>
               ))}
            </div>
         </div>

         {/* RIGHT CONTENT AREA */}
         <div ref={contentRef} className="w-full md:w-2/3 lg:w-3/4 scroll-mt-24">
            <AnimatePresence mode="wait">
               {activeContent && (
                  <motion.article
                     key={activeContent.id}
                     initial={{ opacity: 0, y: 15 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -15 }}
                     transition={{ duration: 0.3, ease: "easeInOut" }}
                     className="bg-white border border-slate-200 rounded-[2rem] shadow-sm p-6 sm:p-10 md:p-14"
                  >
                     {/* Article Header */}
                     <header className="mb-10 md:mb-14 border-b border-slate-100 pb-8">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-200 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                           <activeContent.icon className="w-7 h-7" />
                        </div>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                           {activeContent.title}
                        </h2>
                        {activeContent.subtitle && (
                           <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
                              {activeContent.subtitle}
                           </p>
                        )}
                     </header>

                     {/* Article Body (Serif for Readability) */}
                     <div className="prose prose-slate prose-lg md:prose-xl max-w-none font-serif text-slate-700 leading-[1.8]">
                        {activeContent.content.map((paragraph, idx) => (
                           <p key={idx} className="mb-6">
                              {paragraph}
                           </p>
                        ))}
                     </div>

                     {/* Strategic Priorities Box */}
                     {activeContent.bullets.length > 0 && (
                        <div className="mt-12 md:mt-16 bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-10">
                           <h3 className="text-lg md:text-xl font-black text-slate-900 mb-6 flex items-center gap-2 font-sans tracking-tight">
                              <CheckCircle2 className="w-6 h-6 text-blue-500" /> Key Strategic Priorities
                           </h3>
                           <ul className="space-y-5 font-sans">
                              {activeContent.bullets.map((bullet, idx) => (
                                 <li key={idx} className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200 font-bold text-[10px]">
                                       {idx + 1}
                                    </div>
                                    <p className="text-slate-700 font-medium leading-relaxed m-0 text-base md:text-lg">
                                       {bullet}
                                    </p>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     )}
                     
                     {/* Mobile Next Section Hint */}
                     <div className="mt-12 pt-8 border-t border-slate-100 md:hidden flex justify-between items-center text-sm font-bold text-slate-400">
                        <span>End of section</span>
                        <span className="flex items-center gap-1">Scroll tabs for more <ArrowRight className="w-4 h-4"/></span>
                     </div>
                  </motion.article>
               )}
            </AnimatePresence>
         </div>
      </div>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}