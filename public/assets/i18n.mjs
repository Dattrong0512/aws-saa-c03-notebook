export const messages = {
  vi: {
    domain_all: "Tất cả dịch vụ", domain_security: "Danh tính và bảo mật", domain_compute: "Điện toán và container",
    domain_storage: "Lưu trữ", domain_database: "Cơ sở dữ liệu và phân tích", domain_network: "Mạng và phân phối nội dung", domain_ops: "Tích hợp, vận hành và kiến trúc",
    expand: "Mở tất cả", collapse: "Thu gọn tất cả", backTopic: "Về chủ đề: {0}",
    searchAll: "Tìm trên mọi dịch vụ", searchIn: "Tìm trong {0}",
    resultCount: "{0} kết quả · {1} dịch vụ", searchPrompt: "Nhập từ khóa để tìm",
    searchHelp: "Gõ tên dịch vụ hoặc từ khóa (hỗ trợ không dấu và nhiều từ khóa, tìm cả trong các mục đang đóng).",
    noResults: "Không tìm thấy kết quả cho ‘{0}’", clearSearch: "Xóa tìm kiếm",
    matches: "{0} khớp", moreMatches: "+{0} đoạn khớp khác trong chủ đề này", searching: "Đang tìm…", topics: "{0} chủ đề",
  },
  en: {
    domain_all: "All services", domain_security: "Identity & Security", domain_compute: "Compute & Containers",
    domain_storage: "Storage", domain_database: "Databases & Analytics", domain_network: "Networking & Edge", domain_ops: "Integration, Ops & Architecture",
    expand: "Expand all", collapse: "Collapse all", backTopic: "Back to topic: {0}",
    searchAll: "Search all services", searchIn: "Search in {0}",
    resultCount: "{0} results · {1} services", searchPrompt: "Enter a search term",
    searchHelp: "Enter a service name or keywords. Search supports multiple terms and includes collapsed topics.",
    noResults: "No results for ‘{0}’", clearSearch: "Clear search",
    matches: "{0} matches", moreMatches: "+{0} more matching passages in this topic", searching: "Searching…", topics: "{0} topics",
  },
};

export function translate(language, key, ...values) {
  return messages[language][key].replace(/\{(\d+)\}/g, (_, index) => values[index]);
}

export const t = (key, ...values) => translate(document.documentElement.lang, key, ...values);
