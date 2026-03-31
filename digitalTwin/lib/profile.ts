export type Contact = {
  email: string;
  linkedinUrl: string;
  linkedinLabel: string;
};

export type Highlight = {
  label: string;
  detail: string;
};

export type ExperienceItem = {
  company: string;
  title: string;
  location: string;
  period: string;
  bullets: string[];
};

export type EducationItem = {
  school: string;
  degree: string;
  dates: string;
};

export type Patent = {
  title: string;
  href?: string;
};

export type PortfolioItem = {
  title: string;
  description: string;
  href?: string;
  status: "coming_soon" | "live";
};

export const profile = {
  name: "Rahul Anand",
  title: "Manager of Enterprise Architecture",
  location: "Greater Toronto Area, Canada",
  summary: [
    "Results-driven leader with 20+ years aligning business strategy with resilient technology. I manage enterprise-wide architecture practice, drive digital transformation, and improve business capability through deliberate technology choices—cloud-native patterns, microservices, and API-led integration—with a strong engineering foundation.",
    "I translate complex architecture for executives and delivery teams, balance long-term direction with operational reality, and hire and develop high-performing engineers, architects, and managers.",
  ] as const,
  highlights: [
    {
      label: "20+ years",
      detail: "Strategy-to-delivery leadership across telecom, retail, auto, and platforms.",
    },
    {
      label: "Enterprise scale",
      detail: "Architecture ownership spanning multi-subsidiary programs and 25+ client solutions.",
    },
    {
      label: "Cloud & APIs",
      detail: "Cloud-native, microservices, and API-driven solution design.",
    },
    {
      label: "Teams",
      detail: "Building and retaining engineering, architecture, and program talent.",
    },
  ] satisfies Highlight[],
  contact: {
    email: "rahulanand2005@gmail.com",
    linkedinUrl: "https://www.linkedin.com/in/rahulanand",
    linkedinLabel: "linkedin.com/in/rahulanand",
  } satisfies Contact,
  experience: [
    {
      company: "KAR Global",
      title: "Manager of Enterprise Architecture",
      location: "Toronto, Ontario, Canada",
      period: "July 2016 – Present",
      bullets: [
        "Lead engineers, managers, PMOs, and architects focused on complex problem-solving and continuous delivery.",
        "Own strategic delivery across KAR subsidiaries (ECC, SSO, DMM, RTI, and more).",
        "Steward enterprise architecture to reflect organizational vision, goals, and growth.",
        "Delivered solutions for 25+ clients; manage vendor, partner, offshore, and client relationships.",
        "Navigate competing priorities across stakeholders while mentoring teams for efficient outcomes.",
      ],
    },
    {
      company: "HCL Technologies",
      title: "Senior Technical Manager",
      location: "Noida, India",
      period: "August 2010 – August 2014",
      bullets: [
        "Set strategic direction and technology leadership for large programs (e.g. Pearson, Shopko) with 20–25 person teams.",
        "Led IT strategic planning and enterprise architecture for major greenfield initiatives.",
        "SME and mentor across healthcare, retail, e‑commerce, media, and publishing.",
        "Authored whitepapers on emerging tech; presented complex solution approaches.",
        "Hired and screened technical talent.",
      ],
    },
    {
      company: "Lexmark International",
      title: "Engineering Manager",
      location: "Kolkata, West Bengal, India",
      period: "July 2009 – July 2010",
      bullets: [
        "Managed eight senior software engineers for printer firmware embedded applications.",
        "Owned front-end program management, requirements, and architecture for next-generation printer GUI.",
        "Contributed to ideation and new product development.",
      ],
    },
    {
      company: "AT&T",
      title: "Senior Consultant",
      location: "New Jersey, USA",
      period: "October 2008 – May 2009",
      bullets: [
        "Architected 2G network modules to analyze tower placement, capacity, and geography.",
        "Improved end-to-end system performance.",
      ],
    },
    {
      company: "Lightspeed Research",
      title: "Senior Software Engineer",
      location: "Basking Ridge, New Jersey, USA",
      period: "March 2008 – September 2008",
      bullets: [
        "Analysis, architecture, and design for panel sites in Belgium, France, and Austria.",
        "Led technology assessment and data-quality initiatives—helping drive ~12K new panelists.",
      ],
    },
    {
      company: "AT&T",
      title: "Consultant",
      location: "New Jersey, USA",
      period: "February 2003 – January 2008",
      bullets: [
        "Took ownership as lead architect departed through to stable, mission-critical delivery.",
        "Network monitoring and management, inventory, and map-based trouble reporting.",
        "Solved critical ordering, status, and performance issues threatening program viability.",
        "Lead developer for C‑Bus: rule-based notification, routing, workflow, and automation aligned to AT&T’s “vision of one”.",
        "Enhanced the C‑Bus rules engine; designed and built interfacing systems.",
        "Sole designer/developer of a J2EE–mainframe adapter for network switches, key to multi-vendor test cycles.",
      ],
    },
    {
      company: "TCS",
      title: "Assistant System Engineer",
      location: "India",
      period: "June 2000 – February 2003",
      bullets: [
        "Core Java development across multiple products and project modules with a focus on quality and performance.",
      ],
    },
  ] satisfies ExperienceItem[],
  skills: [
    "Enterprise architecture",
    "Digital transformation",
    "Cloud-native architecture",
    "Microservices",
    "API design (REST)",
    "Spring Boot",
    "Spring Framework",
    "Software engineering leadership",
    "Stakeholder communication",
  ] as const,
  languages: ["English", "Hindi"] as const,
  certifications: ["ITIL Foundation", "Certified SAFe 4 Practitioner"] as const,
  patents: [
    {
      title:
        "Method and apparatus for configuring network systems implementing diverse platforms to perform business tasks",
    },
  ] as Patent[],
  education: [
    {
      school: "York University — Schulich School of Business",
      degree: "MBA, Strategy & OMIS",
      dates: "September 2014 – June 2016",
    },
    {
      school: "National Institute of Technology Durgapur",
      degree: "Bachelor of Engineering (B.E.)",
      dates: "1996 – 2000",
    },
  ] satisfies EducationItem[],
  portfolio: [
    {
      title: "Architecture case studies",
      description:
        "Selected patterns, reference architectures, and delivery stories—documentation in progress.",
      status: "coming_soon",
    },
    {
      title: "Speaking & thought leadership",
      description: "Technical presentations and emerging-technology notes—being curated for public sharing.",
      status: "coming_soon",
    },
    {
      title: "Open initiatives",
      description: "Future home for public repos or community work—watch this space.",
      status: "coming_soon",
    },
  ] as PortfolioItem[],
};
