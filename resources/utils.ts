
export const convertToDate = (date: string) => {
  const iso8601Date = date.replace(/^([\d]{2})\/([\d]{2})\/([\d]{4})$/, '$3-$2-$1');
  return iso8601Date;
}

export const convertToDateTime = (date: string, time: string) => {
  const iso8601Date = date.replace(/^([\d]{2})\/([\d]{2})\/([\d]{4})$/, '$3-$2-$1');
  const timeRegex = /^[\d]{2}:[\d]{2}$/;
  if (!timeRegex.test(time)) {
    time = '00:00';
  }

  return `${iso8601Date} ${time}`;
}

export const dateToExpiration = (date: string, daysToExpiration: number = 30) => {
  const iso8601Date = date.replace(/^([\d]{2})\/([\d]{2})\/([\d]{4})$/, '$3-$2-$1');
  const unixTimestamp = Date.parse(iso8601Date);
  const epochSeconds = unixTimestamp / 1000;

  return epochSeconds + (60 * 60 * 24 * daysToExpiration);
};

export const extractCountryCode = (input: string) => {
  return slugify(input.substring(0, input.length - 1));
}

export const extractDivision = (input: string) => {
  const countryCode = extractCountryCode(input);
  const division = input.substring(input.length - 1);

  const parsedDivision = division === "C"
    ? 4
    : Number(division);
  
  if (countryCode === "e") {
    return parsedDivision + 1;
  }

  return parsedDivision;
}

export const slugify = (text: string) => {
  return text.toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export const tryParseFloat = (input: any, defaultValue = -1) => {
  const parsedInput = parseFloat(input);
  if (Number.isNaN(parsedInput)) {
    return defaultValue;
  }
  return parsedInput;
};