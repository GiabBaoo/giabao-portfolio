import type { PortfolioContent, Skill } from "./types.ts";

const sharedSkills: readonly Skill[] = [
  // Databases
  { name: "Microsoft SQL Server", category: "databases" },
  { name: "T-SQL", category: "databases" },
  { name: "PostgreSQL", category: "databases" },
  { name: "MySQL", category: "databases" },
  { name: "Stored Procedures", category: "databases" },
  { name: "JOIN and UNION", category: "databases" },
  { name: "Database schema analysis", category: "databases" },
  { name: "Foreign key analysis", category: "databases" },
  // Backend
  { name: "ASP.NET Core MVC / Web API", category: "backend" },
  { name: "Node.js", category: "backend" },
  { name: "Express", category: "backend" },
  { name: "RESTful APIs", category: "backend" },
  { name: "C#", category: "backend" },
  { name: "JavaScript", category: "backend" },
  { name: "TypeScript", category: "backend" },
  // Other
  { name: "Flutter", category: "other" },
  { name: "Dart", category: "other" },
  { name: "Java", category: "other" },
  { name: "Python", category: "other" },
  { name: "Git/GitHub", category: "other" },
  { name: "Docker (basic)", category: "other" },
  { name: "Postman", category: "other" },
  { name: "SSMS 18", category: "other" },
  // Healthcare Domain
  { name: "HIS", category: "healthcare" },
  { name: "BHYT", category: "healthcare" },
  { name: "Billing", category: "healthcare" },
  { name: "LIS", category: "healthcare" },
  { name: "CDHA", category: "healthcare" },
  { name: "Pharmacy and Inventory", category: "healthcare" },
];

export const viContent: PortfolioContent = {
  profile: {
    name: "Nguyễn Gia Bảo",
    title: "Backend Developer | Database-focused Developer",
    location: "Thành phố Hồ Chí Minh, Việt Nam",
    email: "truyennguyen744@gmail.com",
    summary:
      "Sinh viên ngành Hệ thống Thông tin tại HUFLIT và Database & Data Intern, tập trung vào SQL Server, T-SQL, Stored Procedures, thiết kế cơ sở dữ liệu quan hệ và phát triển hệ thống backend.",
    heroHighlights: [
      "SQL Server",
      "Database Design",
      "T-SQL",
      "Stored Procedures",
      "Backend Development",
    ],
    aboutParagraphs: [
      "Tôi hiện là sinh viên ngành Công nghệ Thông tin – chuyên ngành Hệ thống Thông tin tại Trường Đại học Ngoại ngữ – Tin học TP. Hồ Chí Minh (HUFLIT), dự kiến tốt nghiệp tháng 06/2027 (GPA 3.2/4.0). Định hướng chuyên môn của tôi tập trung vào kỹ thuật cơ sở dữ liệu quan hệ và phát triển phần mềm backend.",
      "Với vai trò Database & Data Intern tại WinSoft, tôi làm việc trực tiếp với Microsoft SQL Server, T-SQL và Stored Procedures để phân tích cấu trúc dữ liệu, kiểm tra tính hợp lệ dữ liệu và hỗ trợ xử lý các báo cáo viện phí trong lĩnh vực Hệ thống Thông tin Bệnh viện (HIS).",
      "Bên cạnh công việc cơ sở dữ liệu, tôi phát triển các ứng dụng web và hệ thống xử lý dữ liệu với ASP.NET Core, C#, Node.js và TypeScript. Mục tiêu nghề nghiệp của tôi là phát triển theo hướng Backend Developer, xây dựng các hệ thống ổn định với cấu trúc dữ liệu rõ ràng và truy vấn hiệu quả.",
    ],
    cvUrl: null,
    avatarUrl: null,
    socialLinks: [
      {
        platform: "github",
        label: "GitHub",
        url: "https://github.com/GiabBaoo",
      },
      {
        platform: "linkedin",
        label: "LinkedIn",
        url: "https://www.linkedin.com/in/b%E1%BA%A3o-nguy%E1%BB%85n-84405734b/",
      },
      {
        platform: "email",
        label: "Email",
        url: "mailto:truyennguyen744@gmail.com",
      },
    ],
  },
  education: {
    institution: "Trường Đại học Ngoại ngữ – Tin học TP. Hồ Chí Minh (HUFLIT)",
    degree: "Cử nhân Công nghệ Thông tin — Hệ thống Thông tin",
    gpa: "3.2 / 4.0",
    period: "09/2023 – 06/2027 (Dự kiến)",
  },
  experiences: [
    {
      id: "winsoft",
      company: "WinSoft",
      position: "Database & Data Intern",
      kind: "technical",
      startDate: "2026-10",
      endDate: null,
      description:
        "Kinh nghiệm tổng quát làm việc với SQL Server, T-SQL, Stored Procedures, phân tích dữ liệu và báo cáo viện phí trong lĩnh vực Hệ thống Thông tin Bệnh viện (HIS).",
      responsibilities: [
        "Phân tích cấu trúc cơ sở dữ liệu ở mức tổng quát bằng SQL Server và SSMS.",
        "Làm việc với dữ liệu các phân hệ nghiệp vụ chung gồm Viện phí (Billing), BHYT, Xét nghiệm (LIS), Chẩn đoán Hình ảnh (CDHA) và Kho / Dược.",
        "Phát triển và tối ưu hóa các Stored Procedures bằng T-SQL để tái sử dụng nguồn dữ liệu cho báo cáo viện phí.",
        "Xử lý điều kiện lọc báo cáo và kết hợp dữ liệu bằng các phép JOIN và UNION.",
        "Triển khai logic tổng hợp doanh thu, ánh xạ khoa/phòng và truy vết dữ liệu thanh toán ở mức khái niệm kỹ thuật tổng quát.",
        "Điều tra dữ liệu trùng lặp hoặc bị thiếu, thực hiện kiểm tra tính hợp lệ dữ liệu và đối soát số liệu báo cáo với biểu mẫu Excel.",
        "Tài liệu hóa logic truy vấn và yêu cầu báo cáo dữ liệu.",
      ],
    },
    {
      id: "jen-and-co",
      company: "JEN&CO",
      position: "Nhân viên Vận hành Thương mại Điện tử & Kho",
      kind: "non-technical",
      startDate: "2026-01",
      endDate: "2026-08",
      description:
        "Quản lý quy trình xử lý đơn hàng thương mại điện tử, sắp xếp hàng tồn kho và hỗ trợ vận hành các phiên bán hàng trực tiếp.",
      responsibilities: [
        "Quản lý quy trình xử lý đơn hàng nhập kho và xuất kho.",
        "Tổ chức, sắp xếp hàng tồn kho theo kích cỡ và mã SKU.",
        "Thực hiện kiểm soát chất lượng, đóng gói và điều phối giao vận.",
        "Duy trì việc dán nhãn mã vạch và sắp xếp kho bãi.",
        "Hỗ trợ vận hành các phiên livestream trên TikTok và Shopee.",
      ],
    },
    {
      id: "ar-group",
      company: "AR GROUP",
      position: "Người dẫn chương trình Bán hàng Trực tiếp",
      kind: "non-technical",
      startDate: "2025-01",
      endDate: "2025-07",
      description:
        "Dẫn dắt các phiên livestream bán hàng tương tác và giải đáp trực tiếp cho khách hàng theo thời gian thực.",
      responsibilities: [
        "Trực tiếp dẫn dắt các phiên livestream bán hàng tương tác.",
        "Giới thiệu tính năng và đặc điểm nổi bật của sản phẩm.",
        "Tương tác và giải đáp thắc mắc khách hàng theo thời gian thực.",
        "Rèn luyện kỹ năng thuyết trình và giao tiếp.",
      ],
    },
    {
      id: "zwilling",
      company: "Zwilling J.A. Henckels (Vietnam)",
      position: "Nhân viên Bán lẻ & Vận hành Kho",
      kind: "non-technical",
      startDate: "2024-02",
      endDate: "2024-10",
      description:
        "Hỗ trợ vận hành bán lẻ đa kênh, theo dõi nhập xuất kho và thực hiện kiểm kê định kỳ.",
      responsibilities: [
        "Quản lý theo dõi hàng nhập kho và xuất kho.",
        "Thực hiện kiểm kê định kỳ và lập yêu cầu bổ sung hàng hóa.",
        "Hỗ trợ vận hành bán lẻ đa kênh.",
        "Sản xuất video quảng bá sản phẩm trên nền tảng TikTok.",
      ],
    },
  ],
  projects: [
    {
      id: "power-company-database",
      slug: "power-company-database",
      name: "Power Company Database",
      description:
        "Thiết kế cơ sở dữ liệu phân tán trên ba khu vực và sáu máy chủ sử dụng kỹ thuật phân mảnh ngang nhằm đảm bảo tính sẵn sàng và tính nhất quán của dữ liệu.",
      technologies: ["SQL Server", "PostgreSQL", "Node.js", "Supabase"],
      features: [
        "Kiến trúc cơ sở dữ liệu phân tán trên 3 khu vực và 6 máy chủ.",
        "Áp dụng chiến lược phân mảnh ngang cho dữ liệu.",
        "Tập trung vào tính sẵn sàng và tính nhất quán dữ liệu giữa các nút phân tán.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
    {
      id: "coffee-shop-ecommerce",
      slug: "coffee-shop-ecommerce",
      name: "Coffee Shop E-commerce",
      description:
        "Ứng dụng đặt đồ uống trực tuyến tích hợp cổng thanh toán thử nghiệm VNPay Sandbox, gợi ý đồ uống theo tập luật và báo cáo doanh thu.",
      technologies: ["ASP.NET Core", "C#", "Bootstrap 5", "VNPay Sandbox", "Supabase"],
      features: [
        "Quy trình đặt đồ uống trực tuyến.",
        "Tích hợp cổng thanh toán thử nghiệm VNPay Sandbox.",
        "Gợi ý đồ uống dựa trên tập luật.",
        "Báo cáo doanh thu theo ngày và theo tháng.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
    {
      id: "mono-app",
      slug: "mono-app",
      name: "MONO APP (App Money Tracker)",
      description:
        "Ứng dụng quản lý chi tiêu cá nhân và theo nhóm, hỗ trợ nhập liệu bằng giọng nói và biểu đồ phân tích chi tiêu.",
      technologies: ["Flutter", "Dart", "SQLite", "Firebase", "Supabase"],
      features: [
        "Quản lý chi tiêu cá nhân và chi tiêu theo nhóm.",
        "Hỗ trợ nhập liệu giao dịch bằng giọng nói.",
        "Biểu đồ thống kê và phân tích chi tiêu.",
      ],
      role: null,
      imageUrl: null,
      repositoryUrl: null,
      demoUrl: null,
      projectType: null,
    },
  ],
  skills: sharedSkills,
  healthcareGlossary: [
    { abbr: "HIS", meaning: "Hệ thống Thông tin Bệnh viện (Hospital Information System)" },
    { abbr: "BHYT", meaning: "Bảo hiểm Y tế" },
    { abbr: "LIS", meaning: "Hệ thống Thông tin Xét nghiệm (Laboratory Information System)" },
    { abbr: "CDHA", meaning: "Chẩn đoán Hình ảnh (Diagnostic Imaging)" },
  ],
  certifications: [
    {
      id: "ai-fundamentals",
      name: "AI Fundamentals",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
    {
      id: "design-prompts-everyday-work",
      name: "Design Prompts for Everyday Work Tasks",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
    {
      id: "start-writing-prompts-pro",
      name: "Start Writing Prompts like a Pro",
      issuer: null,
      issueDate: null,
      credentialUrl: null,
    },
  ],
};
