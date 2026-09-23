export function formatSeconds(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return "—";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return "0min";
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function formatSecondsShort(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return "0min";
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function formatTimeBD(utcString) {
  if (!utcString) return "—";
  try {
    const date = new Date(utcString);
    return date.toLocaleTimeString("en-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export function formatTimeOnlyBD(utcString) {
  if (!utcString) return "—";
  try {
    return new Date(utcString).toLocaleTimeString("en-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch { return "—"; }
}

export function formatDateOnlyBD(utcString) {
  if (!utcString) return "—";
  try {
    return new Date(utcString).toLocaleDateString("en-BD", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch { return "—"; }
}

// Short date like "23/9/26" (D/M/YY, no leading zeros), Asia/Dhaka
export function formatDateShortBD(utcString) {
  if (!utcString) return "—";
  try {
    const date = new Date(utcString);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "numeric",
      month: "numeric",
      year: "2-digit",
    }).formatToParts(date);
    const day = parts.find((p) => p.type === "day")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const year = parts.find((p) => p.type === "year")?.value;
    if (!day || !month || !year) return "—";
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

export function formatDateTimeBD(utcString) {
  if (!utcString) return "—";
  try {
    const date = new Date(utcString);
    return date.toLocaleString("en-BD", {
      timeZone: "Asia/Dhaka",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export function formatBackupHours(value) {
  if (value === null || value === undefined || value === "" || isNaN(Number(value))) return "—";
  const num = Number(value);
  const hours = Math.floor(num);
  const minutes = Math.round((num - hours) * 60);
  if (hours === 0 && minutes === 0) return "0min";
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case "up": return "up";
    case "down": return "down";
    default: return "unknown";
  }
}