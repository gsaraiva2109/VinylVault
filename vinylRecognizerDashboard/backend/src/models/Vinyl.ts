import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface VinylAttributes {
  id: number;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  genre?: string;
  condition: string;
  coverImage?: string;
  notes?: string;
  spotifyUrl?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface VinylCreationAttributes extends Optional<VinylAttributes, 'id'> {}

class Vinyl extends Model<VinylAttributes, VinylCreationAttributes> implements VinylAttributes {
  public id!: number;
  public title!: string;
  public artist!: string;
  public year?: number;
  public label?: string;
  public genre?: string;
  public condition!: string;
  public coverImage?: string;
  public notes?: string;
  public spotifyUrl?: string;
  public isDeleted?: boolean;
  public deletedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Vinyl.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    artist: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    label: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    genre: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    condition: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'VG+',
    },
    coverImage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    spotifyUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'vinyls',
    timestamps: true,
  }
);

export default Vinyl;
