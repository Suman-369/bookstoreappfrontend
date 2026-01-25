/**
 * Formats a date to show relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatPublishDate = (date) => {
  if (!date) return "";

  const now = new Date();
  const publishDate = new Date(date);
  const diffInSeconds = Math.floor((now - publishDate) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? "week" : "weeks"} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
};

/**
 * Formats a date to show when a user joined (e.g., "January 2024")
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatMemberSince = (date) => {
  if (!date) return "";

  const joinDate = new Date(date);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const month = months[joinDate.getMonth()];
  const year = joinDate.getFullYear();

  return `${month} ${year}`;
};

/**
 * Formats last seen time for WhatsApp-like display
 * @param {string|Date} lastSeenDate - The last seen date
 * @param {boolean} isOnline - Whether the user is currently online
 * @returns {string} Formatted last seen string
 */
export const formatLastSeen = (lastSeenDate, isOnline = false) => {
  // If user is online, always show "online"
  if (isOnline) {
    return "online";
  }
  
  // If no last seen date, show generic message
  if (!lastSeenDate) {
    return "last seen recently";
  }

  const now = new Date();
  const lastSeen = new Date(lastSeenDate);
  const diffInSeconds = Math.floor((now - lastSeen) / 1000);

  // Never show "just now" - minimum is 1 minute
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  
  // If less than 1 minute, show "last seen 1 minute ago" (minimum)
  if (diffInMinutes < 1) {
    return "last seen 1 minute ago";
  }
  
  // If less than 60 minutes, show minutes
  if (diffInMinutes < 60) {
    return `last seen ${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  
  // If same day, show time (e.g., "last seen today at 2:30 PM")
  const today = new Date();
  const isToday = lastSeen.toDateString() === today.toDateString();
  
  if (isToday && diffInHours < 24) {
    const timeStr = lastSeen.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `last seen today at ${timeStr}`;
  }

  // If yesterday, show time
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = lastSeen.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    const timeStr = lastSeen.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `last seen yesterday at ${timeStr}`;
  }

  // If within 7 days, show day and time
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[lastSeen.getDay()];
    const timeStr = lastSeen.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `last seen ${dayName} at ${timeStr}`;
  }

  // If within same year, show date and time
  const currentYear = today.getFullYear();
  const lastSeenYear = lastSeen.getFullYear();
  
  if (lastSeenYear === currentYear) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = lastSeen.getDate();
    const month = months[lastSeen.getMonth()];
    const timeStr = lastSeen.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `last seen ${day} ${month} at ${timeStr}`;
  } else {
    // Different year, show full date and time
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = lastSeen.getDate();
    const month = months[lastSeen.getMonth()];
    const year = lastSeen.getFullYear();
    const timeStr = lastSeen.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `last seen ${day} ${month} ${year} at ${timeStr}`;
  }
};
