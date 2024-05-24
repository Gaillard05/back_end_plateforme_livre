// index.ts

import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { typeDefs } from '../graphql/src/schema.ts';
import { Resolvers, Book } from '../graphql/src/resolvers.ts';
import { title } from 'process';

let db: Db | null = null;
let dbUri: string = "";

async function startMongoDBServer() {
  const mongod = new MongoMemoryServer({
    instance: {
      dbName: "book", // Nom de la base de données
      port: 27017,    // Port de connexion MongoDB
      storageEngine: "wiredTiger",
    },
  });
 
  await mongod.start();
 
  const mongoUri = mongod.getUri();
  dbUri = mongoUri;
  console.log(`MongoDB server started at ${mongoUri}`);
}

async function connectToMongoDB() {
  const uri = dbUri;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    db = client.db(); // Utilisez votre base de données spécifique si nécessaire
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
}

startMongoDBServer()
  .then(() => connectToMongoDB())
  .then(() => {
    const resolvers: Resolvers = {
      Query: {
        books: async () => {
          try {
            if (!db) throw new Error('Database connection not established');
            const allBooks = await db.collection('books').find({}).toArray();
            console.log("All books:", allBooks); // Ajoutez ce log pour afficher les livres
            // Mapper les documents MongoDB vers des objets conformes au schéma GraphQL
            return allBooks.map((doc) => ({
              id: doc._id.toHexString(),
              title: doc.title,
              author: doc.author,
            }));
          } catch (error) {
            console.error("Error fetching books:", error);
            throw new Error("Unable to fetch books from database");
          }
        },
      },
      Mutation: {
        addBook: async (_, {input}) => {
          try {
            if (!db) throw new Error('Database connection not established');
        
            const result = await db.collection('books').insertOne(input);
        
            if (!result) {
              throw new Error("Failed to insert book into database");
            }
        
            // Récupérer l'ID inséré
            const insertedId = result.insertedId;
        
            if (!insertedId) {
              throw new Error("Failed to retrieve inserted book ID");
            }
        
            console.log("Inserted book ID:", insertedId);
        
            // Convertir l'ID en une chaîne
            const newBook = {
              id: insertedId.toHexString(), // Convertir l'ID ObjectId en chaîne
              title: input.title,
              author: input.author,
            };
        
            return newBook;
          } catch (error) {
            console.error("Error adding book:", error);
            throw new Error("Error adding book");
          }
        },
        editBook: async (_, {input}) => {
          try {
            if (!db) throw new Error('Database connection not established');
            
            const result = await db.collection('books').updateOne(
              { _id: new ObjectId(input.id) },
              { $set: { author: input.author, title: input.title } }
            );
        
            if (!result || result.modifiedCount === 0) {
              throw new Error("Failed to update book in the database");
            }
        
            const updatedBook = await db.collection('books').findOne({ _id: new ObjectId(input.id) });
        
            if (!updatedBook) {
              throw new Error("Failed to retrieve updated book from database");
            }
        
            console.log("Updated book:", updatedBook);
        
            return {
              title: updatedBook.title,
              author: updatedBook.author,
            };
          } catch (error) {
            console.error("Error updating book:", error);
            return { title: "", author: "" };
          }
        },
        deleteBook: async (_, {input}) => {
          try {
            if (!db) throw new Error('Database connection not established');

            const book = await db.collection('books').findOne({ _id: new ObjectId(input.id) });

            console.log(book);

            if (!book) {
              throw new Error('Book not found');
            }
            
            const result = await db.collection('books').deleteOne({ _id: new ObjectId(input.id) });
        
            if (!result || result.deletedCount === 0) {
              throw new Error("Failed to delete book from the database");
            }
        
            return {
              author: book.author,
              title: book.title,
            };

          } catch (error) {
            console.error("Error deleting book:", error);
            throw new Error("Error deleting book");
          }
        },
      },
    };

    const server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    startStandaloneServer(server, {
      listen: { port: 4000 },
    }).then(({ url }) => {
      console.log(`🚀  Server ready at: ${url}`);
    }).catch(error => {
      console.error("Failed to start server:", error);
    });
  })
  .catch((error) => {
    console.error("Failed to connect MongoDB server:", error);
  });