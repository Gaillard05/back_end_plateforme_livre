export const typeDefs = `#graphql
input AddBookInput {
  author: String!
  title: String!
}

type Book {
  author: String
  id: String
  title: String
}

input DeleteBookInput {
  id: String!
}

input EditBookInput {
  author: String!
  id: String!
  title: String!
}

type Mutation {
  addBook(input: AddBookInput!): Book!
  deleteBook(input: DeleteBookInput!): Book!
  editBook(input: EditBookInput!): Book!
}

type Query {
  books: [Book]
}`;