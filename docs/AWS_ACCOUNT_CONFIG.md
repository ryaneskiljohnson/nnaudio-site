# AWS Account Configuration

## CORRECT AWS ACCOUNT FOR CYMASPHERE.COM
**Account ID: 375240177147**
**Region: us-east-1**

## DO NOT USE
- Account: 708791793249 (WRONG ACCOUNT)

## Environment Variables
Make sure `.env.local` and production environment use credentials for account `375240177147`.

## Verification
To verify you're in the correct account:
```bash
aws sts get-caller-identity
# Should show Account: 375240177147
```

