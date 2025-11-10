let errorSpy: jest.SpyInstance | undefined;

beforeAll(() => {
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  errorSpy?.mockRestore();
});
