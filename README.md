# Accounts Lambda API - Syed Anique Hussain

This assignment implements a serverless API using AWS Lambda, API Gateway, and DynamoDB to manage users and transactions. The API provides functionalities such as retrieving user balances, making transactions, and creating new users.

## Prerequisites

Before getting started, ensure that you have the following prerequisites:

- AWS CLI installed and configured with the necessary permissions.
- Node.js installed on your local machine.
- Docker installed (for local testing).

## Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/aniquehussain/accounts-api-lambda-sam-vitest
   cd accounts-api-lambda-sam-vitest
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Build the SAM Application:**

   ```bash
   sam build
   ```

4. **Start Local API:**

   ```bash
   DOCKER_HOST=unix://$HOME/.docker/run/docker.sock sam local start-api
   ```

   This command will start a local API server using SAM CLI and Docker. You can test your API locally by making requests to `http://127.0.0.1:3000/`.

## Endpoints

The API supports the following endpoints:

- **POST /**

  Retrieve the balance of a user specified by the `userId` in the request body.

- **PATCH /**
  
  Make a new transaction. Provide the transaction details in the request body, including `userId`, `amount`, and `type` (debit or credit).

- **PUT /**
  
  Create a new user. Provide the `name` of the user in the request body.

## Example

```bash
# Retrieve user balance
curl -X POST http://127.0.0.1:3000/ -d '{"userId": "888c414c-376e-4c2a-bf73-0bae802b7a08"}'

# Make a transaction
curl -X PATCH http://127.0.0.1:3000/ -d '{"userId": "exampleUserId", "amount": 50, "type": "debit"}'

# Create a new user
curl -X PUT http://127.0.0.1:3000/ -d '{"name": "Syed Anique"}'
```

## Deploy to AWS

To deploy the API to AWS, use the following command:

```bash
sam deploy --guided
```

This command will guide you through the deployment process, prompting for necessary information.

## Clean Up

To remove the deployed resources from your AWS account, run:

```bash
sam delete
```

## Testing

The project includes unit tests using Vitest. Follow these steps to run the tests:

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Run Tests:**

   ```bash
   npm run test
   ```

   This command will execute the Vitest tests and provide the test results.


## Live Demo

You can alternatively use the deployed version for testing. Here's the link:

- [Live Demo](https://y04k8u3oja.execute-api.ap-south-1.amazonaws.com/Prod/)

## Postman Collection

For your convenience, a Postman collection with sample requests is provided. You can import this collection into your Postman workspace to quickly test the API. You can change the endpoint to http://127.0.0.1:3000/ for local testing.

- [Postman Collection](https://drive.google.com/file/d/1_XbdyVgGSOTzeaY_-50gY2-G04wzGnLA/view?usp=sharing)

Feel free to explore and test the API using the provided live demo and Postman collection!

## Notes

- Ensure that your AWS credentials are properly configured.
- This example uses the AWS Serverless Application Model (SAM). Modify the `template.yaml` file according to your needs.
- Customize the DynamoDB table names (`Users` and `Transactions`) in the code and configuration files as required.


