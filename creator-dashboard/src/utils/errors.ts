export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}

export class WalletError extends AppError {
  constructor(message: string) {
    super(message, 'WALLET_ERROR');
    this.name = 'WalletError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class ContractError extends AppError {
  constructor(message: string) {
    super(message, 'CONTRACT_ERROR');
    this.name = 'ContractError';
  }
}

export class IPFSError extends AppError {
  constructor(message: string) {
    super(message, 'IPFS_ERROR');
    this.name = 'IPFSError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export function parseError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    if (error.message.includes('user rejected')) {
      return 'Transaction rejected by user';
    }
    
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    
    if (error.message.includes('nonce')) {
      return 'Transaction nonce error. Please try again';
    }
    
    if (error.message.includes('gas')) {
      return 'Gas estimation failed. Please try again';
    }
    
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unknown error occurred';
}

export function handleContractError(error: unknown): string {
  const message = parseError(error);
  
  if (message.includes('ERC721: invalid token ID')) {
    return 'NFT does not exist';
  }
  
  if (message.includes('ERC721: caller is not token owner')) {
    return 'You do not own this NFT';
  }
  
  if (message.includes('ERC721: approval to current owner')) {
    return 'Cannot approve yourself';
  }
  
  if (message.includes('Ownable: caller is not the owner')) {
    return 'Only contract owner can perform this action';
  }
  
  if (message.includes('Batch size')) {
    return 'Batch size exceeds maximum limit';
  }
  
  if (message.includes('Empty')) {
    return 'Input cannot be empty';
  }
  
  return message;
}

export function isUserRejection(error: unknown): boolean {
  const message = parseError(error);
  return message.toLowerCase().includes('rejected') || 
         message.toLowerCase().includes('denied');
}

export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('user rejected')) {
      return 'Transaction rejected by user';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }
    return error.message;
  }
  return 'Unknown contract error';
}

export function parseTransactionError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('user rejected') || error.message.includes('User denied')) {
      return 'Transaction was rejected';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for gas';
    }
    if (error.message.includes('execution reverted')) {
      return 'Transaction reverted by contract';
    }
    if (error.message.includes('nonce')) {
      return 'Transaction nonce error. Try again.';
    }
    return error.message;
  }
  return 'Transaction failed';
}