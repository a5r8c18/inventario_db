/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/require-await */
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUploadError } from '../common/exceptions/file-upload.error';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../common/mail/mail.service';
import { extname } from 'path';
import { diskStorage } from 'multer';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async login(loginDto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async signup(signupDto: SignupDto): Promise<{ accessToken: string }> {
    const { firstName, lastName, company, email, phone, password } = signupDto;

    // Validar requisitos de la contraseña
    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('La contraseña debe contener al menos una mayúscula');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      throw new Error(
        'La contraseña debe contener al menos un carácter especial',
      );
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('La contraseña debe contener al menos un número');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      firstName,
      lastName,
      company,
      email,
      phone,
      password: hashedPassword,
      memberSince: new Date(),
    });

    await this.userRepository.save(user);

    const payload = {
      sub: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
    };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const resetToken = uuidv4();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora de expiración

    await this.userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      resetTokenExpiry,
    );

    console.log(`Token de restablecimiento para ${email}: ${resetToken}`); // Reemplazar con servicio de correo
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    const user = await this.userRepository.findOne({
      where: { resetToken: token },
    });

    if (!user) {
      throw new NotFoundException('Token de restablecimiento inválido');
    }

    if (!user.resetTokenExpiry) {
      throw new Error('Token de restablecimiento inválido');
    }

    // Verificar si el token ha expirado
    if (user.resetTokenExpiry < new Date()) {
      throw new Error('Token de restablecimiento expirado');
    }

    // Validar la nueva contraseña
    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('La contraseña debe contener al menos una mayúscula');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      throw new Error('La contraseña debe contener al menos un carácter especial');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('La contraseña debe contener al menos un número');
    }

    // Actualizar la contraseña y limpiar el token
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null,
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await this.userRepository.save(user);
  }

  async getUserProfile(userId: number): Promise<any> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        company: user.company,
        memberSince: user.memberSince,
        avatar: user.avatar,
      },
    };
  }

  async getCurrentUserName(userId: number): Promise<string> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return `${user.firstName} ${user.lastName}`;
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si el correo ya está en uso por otro usuario
    if (updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });
      if (existingUser) {
        throw new UnauthorizedException('El correo ya está en uso');
      }
    }

    Object.assign(user, updateProfileDto);
    await this.userRepository.save(user);
    return user;
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const { oldPassword, newPassword } = changePasswordDto;
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Contraseña actual inválida');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);
  }

  async updateAvatar(
    userId: number,
    file: Express.Multer.File,
  ): Promise<{ avatar: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Generar un nombre de archivo único
    const filename = `${uuidv4()}${extname(file.originalname)}`;
    const avatarUrl = `http://localhost:3000/uploads/${filename}`; // Ajustar según la configuración del servidor

    // El archivo ya está guardado por Multer, solo actualiza la URL del avatar
    user.avatar = avatarUrl;
    await this.userRepository.save(user);

    return { avatar: avatarUrl };
  }

  async logout(userId: number): Promise<void> {
    // En un sistema basado en JWT, el logout se maneja en el cliente eliminando el token
    console.log(`Usuario ${userId} cerró sesión`);
  }

  // Configuración de Multer para carga de archivos
  static multerOptions = {
    storage: diskStorage({
      destination: './uploads', // Asegúrate de que este directorio exista
      filename: (
        req: any,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void,
      ) => {
        const filename = `${uuidv4()}${extname(file.originalname)}`;
        cb(null, filename);
      },
    }),
    fileFilter: (
      req: any,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new FileUploadError('Solo se permiten archivos de imagen'), false);
      }
    },
  };
}
