declare module 'amqplib' {
  export interface Channel {
    assertQueue(queue: string, options?: any): Promise<any>;
    bindQueue?(queue: string, exchange: string, pattern: string, args?: any): Promise<any>;
    sendToQueue(queue: string, content: Buffer, options?: any): boolean;
    consume(queue: string, onMessage: (msg: any) => void, options?: any): Promise<any>;
    ack(msg: any): void;
    nack(msg: any, allUpTo?: boolean, requeue?: boolean): void;
    prefetch(count: number): Promise<void>;
    close(): Promise<void>;
  }
  export interface Connection {
    createChannel(): Promise<Channel>;
    close(): Promise<void>;
  }
  export function connect(url: string): Promise<Connection>;
  const _default: { connect(url: string): Promise<Connection> };
  export default _default;
}
