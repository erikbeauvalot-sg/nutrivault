---
description: 'Design patterns (creational, structural, behavioral), SOLID principles, composition over inheritance, and avoiding anti-patterns'
applyTo: '**/*.{py,js,ts,java,cs,go}'
---

# Code Design Patterns

## Overview
Design patterns are reusable solutions to common software design problems. This document covers essential patterns with practical examples, emphasizing Clean Code principles and SOLID design.

## Creational Patterns

### Singleton Pattern
Ensures a class has only one instance and provides global access to it.

```javascript
class Database {
  constructor() {
    if (Database.instance) {
      return Database.instance;
    }
    
    this.connection = this.createConnection();
    Database.instance = this;
  }
  
  createConnection() {
    // Create database connection
    return { /* connection object */ };
  }
  
  query(sql) {
    return this.connection.execute(sql);
  }
}

// Usage
const db1 = new Database();
const db2 = new Database();
console.log(db1 === db2); // true
```

**When to use**:
- Logger instances
- Configuration managers
- Database connections
- Thread pools

**Caution**: Can make testing difficult; consider dependency injection instead.

### Factory Pattern
Creates objects without specifying exact class.

```javascript
class UserFactory {
  static createUser(type, data) {
    switch (type) {
      case 'admin':
        return new AdminUser(data);
      case 'moderator':
        return new ModeratorUser(data);
      case 'regular':
        return new RegularUser(data);
      default:
        throw new Error(`Unknown user type: ${type}`);
    }
  }
}

// Usage
const admin = UserFactory.createUser('admin', { name: 'John' });
const user = UserFactory.createUser('regular', { name: 'Jane' });
```

### Builder Pattern
Constructs complex objects step by step.

```javascript
class QueryBuilder {
  constructor() {
    this.query = {
      select: [],
      from: null,
      where: [],
      orderBy: [],
      limit: null
    };
  }
  
  select(...fields) {
    this.query.select.push(...fields);
    return this;
  }
  
  from(table) {
    this.query.from = table;
    return this;
  }
  
  where(condition) {
    this.query.where.push(condition);
    return this;
  }
  
  orderBy(field, direction = 'ASC') {
    this.query.orderBy.push({ field, direction });
    return this;
  }
  
  limit(count) {
    this.query.limit = count;
    return this;
  }
  
  build() {
    // Convert to SQL string
    return this.toSQL();
  }
  
  toSQL() {
    const select = this.query.select.join(', ') || '*';
    const from = this.query.from;
    const where = this.query.where.length ? 
      `WHERE ${this.query.where.join(' AND ')}` : '';
    const orderBy = this.query.orderBy.length ?
      `ORDER BY ${this.query.orderBy.map(o => `${o.field} ${o.direction}`).join(', ')}` : '';
    const limit = this.query.limit ? `LIMIT ${this.query.limit}` : '';
    
    return `SELECT ${select} FROM ${from} ${where} ${orderBy} ${limit}`.trim();
  }
}

// Usage
const query = new QueryBuilder()
  .select('id', 'name', 'email')
  .from('users')
  .where('age > 18')
  .where('status = "active"')
  .orderBy('name', 'ASC')
  .limit(10)
  .build();
```

## Structural Patterns

### Adapter Pattern
Allows incompatible interfaces to work together.

```javascript
// Old payment processor
class OldPaymentProcessor {
  processPayment(amount) {
    return { success: true, amount };
  }
}

// New payment processor with different interface
class NewPaymentProcessor {
  pay(data) {
    return { status: 'success', total: data.total };
  }
}

// Adapter
class PaymentAdapter {
  constructor(processor) {
    this.processor = processor;
  }
  
  processPayment(amount) {
    if (this.processor instanceof NewPaymentProcessor) {
      const result = this.processor.pay({ total: amount });
      return {
        success: result.status === 'success',
        amount: result.total
      };
    }
    return this.processor.processPayment(amount);
  }
}

// Usage
const oldProcessor = new PaymentAdapter(new OldPaymentProcessor());
const newProcessor = new PaymentAdapter(new NewPaymentProcessor());

oldProcessor.processPayment(100); // Works
newProcessor.processPayment(100); // Also works with same interface
```

### Decorator Pattern
Adds behavior to objects dynamically.

```javascript
class Coffee {
  cost() {
    return 2;
  }
  
  description() {
    return 'Coffee';
  }
}

class MilkDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }
  
  cost() {
    return this.coffee.cost() + 0.5;
  }
  
  description() {
    return `${this.coffee.description()}, Milk`;
  }
}

class SugarDecorator {
  constructor(coffee) {
    this.coffee = coffee;
  }
  
  cost() {
    return this.coffee.cost() + 0.2;
  }
  
  description() {
    return `${this.coffee.description()}, Sugar`;
  }
}

// Usage
let coffee = new Coffee();
console.log(coffee.description(), coffee.cost()); // Coffee, 2

coffee = new MilkDecorator(coffee);
console.log(coffee.description(), coffee.cost()); // Coffee, Milk, 2.5

coffee = new SugarDecorator(coffee);
console.log(coffee.description(), coffee.cost()); // Coffee, Milk, Sugar, 2.7
```

### Facade Pattern
Provides simplified interface to complex subsystem.

```javascript
class VideoConverter {
  constructor() {
    this.codec = new CodecFactory();
    this.audioMixer = new AudioMixer();
    this.bitrateReader = new BitrateReader();
  }
  
  convert(filename, format) {
    const file = new VideoFile(filename);
    const sourceCodec = this.codec.extract(file);
    const destinationCodec = this.codec.getCodec(format);
    
    const buffer = this.bitrateReader.read(file, sourceCodec);
    const result = this.bitrateReader.convert(buffer, destinationCodec);
    
    result.audio = this.audioMixer.fix(result);
    
    return new File(result);
  }
}

// Usage - Simple interface hiding complexity
const converter = new VideoConverter();
const mp4 = converter.convert('video.avi', 'mp4');
```

## Behavioral Patterns

### Observer Pattern
Notifies multiple objects about state changes.

```javascript
class EventEmitter {
  constructor() {
    this.events = {};
  }
  
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }
  
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  }
  
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }
}

// Usage
class UserService extends EventEmitter {
  createUser(data) {
    const user = this.save(data);
    this.emit('userCreated', user);
    return user;
  }
}

const userService = new UserService();

userService.on('userCreated', (user) => {
  console.log('Send welcome email to', user.email);
});

userService.on('userCreated', (user) => {
  console.log('Log user creation:', user.id);
});

userService.createUser({ email: 'user@example.com' });
```

### Strategy Pattern
Defines family of algorithms and makes them interchangeable.

```javascript
// Strategies
class CreditCardPayment {
  pay(amount) {
    console.log(`Paid ${amount} with credit card`);
  }
}

class PayPalPayment {
  pay(amount) {
    console.log(`Paid ${amount} with PayPal`);
  }
}

class CryptoPayment {
  pay(amount) {
    console.log(`Paid ${amount} with cryptocurrency`);
  }
}

// Context
class PaymentProcessor {
  constructor(strategy) {
    this.strategy = strategy;
  }
  
  setStrategy(strategy) {
    this.strategy = strategy;
  }
  
  processPayment(amount) {
    this.strategy.pay(amount);
  }
}

// Usage
const processor = new PaymentProcessor(new CreditCardPayment());
processor.processPayment(100);

processor.setStrategy(new PayPalPayment());
processor.processPayment(50);
```

### Command Pattern
Encapsulates requests as objects.

```javascript
class Command {
  execute() {
    throw new Error('Execute method must be implemented');
  }
  
  undo() {
    throw new Error('Undo method must be implemented');
  }
}

class CopyCommand extends Command {
  constructor(editor) {
    super();
    this.editor = editor;
    this.backup = null;
  }
  
  execute() {
    this.backup = this.editor.getSelection();
    this.editor.clipboard = this.backup;
  }
  
  undo() {
    this.editor.setSelection(this.backup);
  }
}

class PasteCommand extends Command {
  constructor(editor) {
    super();
    this.editor = editor;
    this.backup = null;
  }
  
  execute() {
    this.backup = this.editor.getSelection();
    this.editor.replaceSelection(this.editor.clipboard);
  }
  
  undo() {
    this.editor.setSelection(this.backup);
  }
}

class CommandHistory {
  constructor() {
    this.history = [];
  }
  
  push(command) {
    this.history.push(command);
  }
  
  pop() {
    return this.history.pop();
  }
}

// Usage
const editor = new Editor();
const history = new CommandHistory();

const copy = new CopyCommand(editor);
copy.execute();
history.push(copy);

const paste = new PasteCommand(editor);
paste.execute();
history.push(paste);

// Undo
const lastCommand = history.pop();
lastCommand.undo();
```

### Template Method Pattern
Defines skeleton of algorithm, letting subclasses override steps.

```javascript
class DataProcessor {
  process() {
    this.readData();
    this.processData();
    this.writeData();
  }
  
  readData() {
    throw new Error('readData must be implemented');
  }
  
  processData() {
    throw new Error('processData must be implemented');
  }
  
  writeData() {
    throw new Error('writeData must be implemented');
  }
}

class CSVProcessor extends DataProcessor {
  readData() {
    console.log('Reading CSV file');
    this.data = ['row1', 'row2', 'row3'];
  }
  
  processData() {
    console.log('Processing CSV data');
    this.data = this.data.map(row => row.toUpperCase());
  }
  
  writeData() {
    console.log('Writing processed CSV');
    console.log(this.data);
  }
}

class JSONProcessor extends DataProcessor {
  readData() {
    console.log('Reading JSON file');
    this.data = { items: [1, 2, 3] };
  }
  
  processData() {
    console.log('Processing JSON data');
    this.data.items = this.data.items.map(x => x * 2);
  }
  
  writeData() {
    console.log('Writing processed JSON');
    console.log(this.data);
  }
}

// Usage
const csvProcessor = new CSVProcessor();
csvProcessor.process();

const jsonProcessor = new JSONProcessor();
jsonProcessor.process();
```

## SOLID Principles with Patterns

### Single Responsibility Principle
Each class should have one reason to change.

```javascript
// ❌ Bad: Multiple responsibilities
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
  
  save() {
    // Database logic
  }
  
  sendEmail() {
    // Email logic
  }
  
  generateReport() {
    // Report logic
  }
}

// ✅ Good: Single responsibility
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserRepository {
  save(user) {
    // Database logic
  }
}

class EmailService {
  sendEmail(user, message) {
    // Email logic
  }
}

class ReportGenerator {
  generateUserReport(user) {
    // Report logic
  }
}
```

### Open/Closed Principle
Open for extension, closed for modification.

```javascript
// ✅ Good: Using strategy pattern
class ShapeCalculator {
  calculateArea(shape) {
    return shape.area();
  }
}

class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  
  area() {
    return this.width * this.height;
  }
}

class Circle {
  constructor(radius) {
    this.radius = radius;
  }
  
  area() {
    return Math.PI * this.radius ** 2;
  }
}

// Can add new shapes without modifying ShapeCalculator
```

### Dependency Inversion Principle
Depend on abstractions, not concretions.

```javascript
// ❌ Bad: Depending on concrete class
class UserService {
  constructor() {
    this.database = new MySQLDatabase(); // Tight coupling
  }
}

// ✅ Good: Depending on abstraction
class UserService {
  constructor(database) { // Inject dependency
    this.database = database;
  }
  
  getUser(id) {
    return this.database.find('users', id);
  }
}

// Can inject any database implementation
const mysqlService = new UserService(new MySQLDatabase());
const mongoService = new UserService(new MongoDatabase());
```

## Anti-Patterns to Avoid

### God Object
```javascript
// ❌ Bad: One class does everything
class Application {
  // Thousands of lines
  // Handles UI, database, business logic, networking, etc.
}

// ✅ Good: Separated concerns
class UIController { }
class DatabaseService { }
class BusinessLogic { }
class NetworkClient { }
```

### Golden Hammer
```javascript
// ❌ Bad: Using inheritance for everything
class BaseClass { }
class ChildClass1 extends BaseClass { }
class ChildClass2 extends BaseClass { }
// Deep inheritance hierarchies

// ✅ Good: Composition over inheritance
class Component {
  constructor() {
    this.behaviors = [];
  }
  
  addBehavior(behavior) {
    this.behaviors.push(behavior);
  }
}
```

## Pattern Selection Guide

### Choose based on problem:
- **Creating objects**: Factory, Builder, Singleton
- **Structuring code**: Adapter, Decorator, Facade
- **Behavior**: Observer, Strategy, Command
- **Communication**: Mediator, Chain of Responsibility

## Resources

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns)
- [Refactoring Guru](https://refactoring.guru/design-patterns)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
