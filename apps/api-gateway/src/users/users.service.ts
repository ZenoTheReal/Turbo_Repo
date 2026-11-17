import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { User } from './schema/user.entity.js';
import { Role } from './schema/role.entity.js';

@Injectable()
export class UsersService {
  private userRepository: Repository<User>;
  private roleRepository: Repository<Role>;

  constructor(private readonly database: Database) {
    this.userRepository = this.database.dataSource.getRepository(User);
    this.roleRepository = this.database.dataSource.getRepository(Role);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  // 🔍 Find role by name ('ADMIN', 'SELLER', 'BUYER')
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role') // 👈 Joins the role table
      .where('user.email = :email', { email });

    if (includePassword) {
      query.addSelect('user.password');
    }

    return query.getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }
}