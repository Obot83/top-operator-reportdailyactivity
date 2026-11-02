import { MongoClient } from 'mongodb';

const uri =
  process.env.MONGODB_URI ??
  'mongodb://topop_kospinus:2Qz55l48V777@103.127.135.231:27018,103.125.181.93:27018/topop_kospinus?authSource=admin&replicaSet=rs0&readPreference=primary';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function getMongoDb(databaseName = 'topop_kospinus') {
  const client = await clientPromise;
  return client.db(databaseName);
}

export default clientPromise;
