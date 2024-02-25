import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 } from "uuid";
import { APIGatewayProxyEvent } from "aws-lambda";

const Users = "Users";
const Transactions = "Transactions";

type User = {
  userId: string;
  name: string;
  balance: number;
};

type Transaction = {
  userId: string;
  transactionId: string;
  amount: number;
  type: string;
  createdAt: string;
};

type Response = {
  statusCode: number;
  body: any;
};
// Create a DynamoDB client
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Initialize the Lambda function
export const lambdaHandler = async (event: APIGatewayProxyEvent) => {
  
  // check if client is initialized
  if (!ddbDocClient) {
    throw new Error("DynamoDB client not initialized");
  }
  
  // Initialize the response
  let response: Response = {
    statusCode: 200,
    body: { message: "" },
  };

  // Get the HTTP method
  let httpRequest = event.httpMethod as string;

  // Parse the request body
  const body = JSON.parse(event.body as string);

  // Get the userId, amount, and type from the request body
  const { userId, amount, type } = body;
  try {
    // Switch on the HTTP method
    switch (httpRequest) {
      //  If the request is a POST request
      case "POST":
        // Get the user's balance
        const user: User = await getUser(ddbDocClient, userId) as User;
        const balance: number = user?.balance || 0;

        // Return the user's balance
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "User balance retrieved successfully",
            balance: balance,
          }),
        };
        break;

      // If the request is a PATCH request
      case "PATCH":
        // Check if the transaction type is valid
        if (type !== "debit" && type !== "credit") {
          throw new Error(
            "Invalid transaction type. Must be 'debit' or 'credit'."
          );
        }
        // Create a new transaction
        const transactionId = v4();

        // Prepare the transaction object
        const transaction: Transaction = {
          userId,
          transactionId,
          amount,
          type,
          createdAt: new Date().toISOString(),
        };

        // Make the transaction
        await transact(ddbDocClient, transaction);

        // Return the response
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "Transaction successful",
            transactionId: transaction.transactionId,
            type,
          }),
        };
        break;

      // If the request is a PUT request
      case "PUT":
        // Prepare the user object
        const userBody = {
          name: body.name,
          userId: v4(),
          balance: 100,
        };

        // Add the user to the Users table
        await createUser(ddbDocClient, userBody);

        // Return the response
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "User created successfully",
            userId: userBody.userId,
          }),
        };
        break;

      default:
        // If the request is invalid, return an error
        response = {
          statusCode: 400,
          body: "Invalid request",
        };
        break;
    }
  } catch (err: any) {
    // If there's an error, return the error message
    response = {
      statusCode: 400,
      body: err.message,
    };
  } finally {
    // Return the response object and destroy the client
    ddbDocClient.destroy();
    return response;
  }
};

// Function to create a user
const createUser = async (dbClient: typeof ddbDocClient, user: User) => {
  //check if user exists
  const users: User[] = await getAllUsers(dbClient) as User[];
  // Check if the user already exists
  const userExists = users.some((u: User) => u.userId === user.userId);
  if (userExists) {
    throw new Error("User already exists");
  }
  // Prepare the parameters
  let params = {
    TableName: Users,
    Item: user,
  };

  // Add the user to the Users table
  return await dbClient.send(new PutCommand(params));
};

// Function to get all users
const getAllUsers = async (dbClient: typeof ddbDocClient) => {
  let params = {
    TableName: Users,
  };
  const data = await dbClient.send(new ScanCommand(params));
  return data.Items;
};

// Function to get a user
const getUser = async (dbClient: typeof ddbDocClient, userId: string) => {
  let params = {
    TableName: Users,
    Key: { userId: userId },
  };
  const data = await dbClient.send(new GetCommand(params));
  return data.Item;
};

// Function to make a transaction
const transact = async (
  dbClient: typeof ddbDocClient,
  transaction: Transaction
) => {
  // Check for idempotency
  const isIdempotent: boolean = await checkIdempotency(dbClient, transaction);

  // If the transaction is idempotent, skip it
  if (isIdempotent) {
    console.log(
      `Transaction with ID ${transaction.transactionId} is idempotent. Skipping.`
    );
    return;
  }

  // Put the transaction into DynamoDB
  let params: any = {
    TableName: Transactions,
    Item: transaction,
  };

  // Add the transaction to the Transactions table
  await dbClient.send(new PutCommand(params));

  // Update the user's balance
  const user: User = await getUser(dbClient, transaction.userId) as User;

  // Check if the user has sufficient funds for a debit transaction
  if (transaction.type === "debit" && user.balance - transaction.amount < 0)
    throw new Error("Insufficient funds");

  // Calculate the new balance
  const newBalance =
    transaction.type === "debit"
      ? user.balance - transaction.amount
      : user.balance + transaction.amount;

  // Prepare the update parameters
  params = {
    TableName: Users,
    Key: { userId: transaction.userId },
    UpdateExpression: "set balance = :balance",
    ExpressionAttributeValues: {
      ":balance": newBalance,
    },
    ReturnValues: "UPDATED_NEW",
  };

  // Update the user's balance
  await dbClient.send(new UpdateCommand(params));
};

const checkIdempotency = async (
  dbClient: typeof ddbDocClient,
  transaction: Transaction
) => {
  // Check if the transactionId exists in the Transactions table
  // If it does, the transaction is idempotent

  let params = {
    TableName: Transactions,
    Key: {
      transactionId: transaction.transactionId,
      userId: transaction.userId,
    },
  };

  const data = await dbClient.send(new GetCommand(params));
  return !!data.Item; // Returns true if the transactionId is found, indicating idempotency
};
