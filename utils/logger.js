import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

const { combine, timestamp, json, printf} = format;

const logLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

// Custom format to ensure flat structure
const customFormat = printf(({ level, message, timestamp, ...meta }) => {
  const logObject = {
    level,
    ...message,
    timestamp,
    ...meta,
  };
  return JSON.stringify(logObject);
});

const logger = createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }),
    json(),
    customFormat
  ),
  transports: [
    new transports.Console(),
    new transports.DailyRotateFile({
      filename: "logs/application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "100d",
      zippedArchive: true,
    }),
  ],
});

export default logger;
