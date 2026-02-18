import * as csv from "fast-csv";
import { Readable } from "stream";

export const parseCSV = async (buffer: Buffer): Promise<any[]> => {
  const stream = Readable.from(buffer.toString());
  return new Promise((resolve, reject) => {
    const data: any[] = [];
    stream
      .pipe(csv.parse({ headers: true, ignoreEmpty: true, trim: true }))
      .on("error", (error) => reject(error))
      .on("data", (row) => data.push(row))
      .on("end", () => resolve(data));
  });
};

export const generateCSV = (data: any[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    csv
      .writeToString(data, { headers: true })
      .then((result) => resolve(result))
      .catch((err) => reject(err));
  });
};
