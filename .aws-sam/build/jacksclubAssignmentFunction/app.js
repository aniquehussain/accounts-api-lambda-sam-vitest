"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// app.ts
var app_exports = {};
__export(app_exports, {
  lambdaHandler: () => lambdaHandler
});
module.exports = __toCommonJS(app_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_lib_dynamodb = require("@aws-sdk/lib-dynamodb");
var import_uuid = require("uuid");
var Users = "Users";
var Transactions = "Transactions";
var client = new import_client_dynamodb.DynamoDBClient({});
var ddbDocClient = import_lib_dynamodb.DynamoDBDocumentClient.from(client);
var lambdaHandler = async (event) => {
  if (!ddbDocClient) {
    throw new Error("DynamoDB client not initialized");
  }
  let response = {
    statusCode: 200,
    body: { message: "" }
  };
  let httpRequest = event.httpMethod;
  const body = JSON.parse(event.body);
  const { userId, amount, type } = body;
  try {
    switch (httpRequest) {
      case "POST":
        if (!userId) {
          throw new Error("User ID is required");
        }
        const user = await getUser(ddbDocClient, userId);
        const balance = user?.balance || 0;
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "User balance retrieved successfully",
            balance
          })
        };
        break;
      case "PATCH":
        if (type !== "debit" && type !== "credit") {
          throw new Error(
            "Invalid transaction type. Must be 'debit' or 'credit'."
          );
        }
        if (!amount) {
          throw new Error("Amount is required");
        }
        if (isNaN(parseFloat(amount)) || !isFinite(amount) || parseFloat(amount) <= 0) {
          throw new Error("Invalid amount");
        }
        const transactionId = (0, import_uuid.v4)();
        const transaction = {
          userId,
          transactionId,
          amount: parseFloat(amount),
          type,
          createdAt: new Date().toISOString()
        };
        await transact(ddbDocClient, transaction);
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "Transaction successful",
            transactionId: transaction.transactionId,
            type
          })
        };
        break;
      case "PUT":
        if (!body.name) {
          throw new Error("Name is required");
        }
        const userBody = {
          name: body.name,
          userId: (0, import_uuid.v4)(),
          balance: 100
        };
        await createUser(ddbDocClient, userBody);
        response = {
          statusCode: 200,
          body: JSON.stringify({
            message: "User created successfully",
            userId: userBody.userId
          })
        };
        break;
      default:
        response = {
          statusCode: 400,
          body: "Invalid request"
        };
        break;
    }
  } catch (err) {
    response = {
      statusCode: 400,
      body: err.message
    };
  } finally {
    ddbDocClient.destroy();
    return response;
  }
};
var createUser = async (dbClient, user) => {
  const users = await getAllUsers(dbClient);
  const userExists = users.some((u) => u.userId === user.userId);
  if (userExists) {
    throw new Error("User already exists");
  }
  let params = {
    TableName: Users,
    Item: user
  };
  return await dbClient.send(new import_lib_dynamodb.PutCommand(params));
};
var getAllUsers = async (dbClient) => {
  let params = {
    TableName: Users
  };
  const data = await dbClient.send(new import_lib_dynamodb.ScanCommand(params));
  return data.Items;
};
var getUser = async (dbClient, userId) => {
  let params = {
    TableName: Users,
    Key: { userId }
  };
  const data = await dbClient.send(new import_lib_dynamodb.GetCommand(params));
  return data.Item;
};
var transact = async (dbClient, transaction) => {
  const isIdempotent = await checkIdempotency(dbClient, transaction);
  if (isIdempotent) {
    console.log(
      `Transaction with ID ${transaction.transactionId} is idempotent. Skipping.`
    );
    return;
  }
  let params = {
    TableName: Transactions,
    Item: transaction
  };
  await dbClient.send(new import_lib_dynamodb.PutCommand(params));
  const user = await getUser(dbClient, transaction.userId);
  if (transaction.type === "debit" && user.balance - transaction.amount < 0)
    throw new Error("Insufficient funds");
  const newBalance = transaction.type === "debit" ? user.balance - transaction.amount : user.balance + transaction.amount;
  params = {
    TableName: Users,
    Key: { userId: transaction.userId },
    UpdateExpression: "set balance = :balance",
    ExpressionAttributeValues: {
      ":balance": newBalance
    },
    ReturnValues: "UPDATED_NEW"
  };
  await dbClient.send(new import_lib_dynamodb.UpdateCommand(params));
};
var checkIdempotency = async (dbClient, transaction) => {
  let params = {
    TableName: Transactions,
    Key: {
      transactionId: transaction.transactionId,
      userId: transaction.userId
    }
  };
  const data = await dbClient.send(new import_lib_dynamodb.GetCommand(params));
  return !!data.Item;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  lambdaHandler
});
//# sourceMappingURL=app.js.map
