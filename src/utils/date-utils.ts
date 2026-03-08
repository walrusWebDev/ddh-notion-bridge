export const formatNotionDate = (d: Date): string => {
  return d.toISOString();
};

export const startOfDayIso = (d: Date): string => {
  const copy = new Date(d);
  copy.setUTCHours(0, 0, 0, 0);
  return copy.toISOString();
};

export default { formatNotionDate, startOfDayIso };
